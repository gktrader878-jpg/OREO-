import { AgentPlanner } from './AgentPlanner';
import { AgentExecutor } from './AgentExecutor';
import { AgentTaskManager } from './AgentTaskManager';
import { AgentPermissions } from './AgentPermissions';
import {
  AgentEvent,
  AgentFinalResult,
  AgentStatus,
  AgentStep,
  AgentTask,
} from './AgentTypes';

export type AgentEventListener = (event: AgentEvent) => void;

export class AgentEngine {
  private static instance: AgentEngine | null = null;
  private planner: AgentPlanner = AgentPlanner.getInstance();
  private executor: AgentExecutor = AgentExecutor.getInstance();
  private taskManager: AgentTaskManager = AgentTaskManager.getInstance();
  private permissions: AgentPermissions = AgentPermissions.getInstance();

  private status: AgentStatus = 'idle';
  private currentTask: AgentTask | null = null;
  private isCancelled: boolean = false;
  private isPaused: boolean = false;
  private listeners: Set<AgentEventListener> = new Set();

  public static getInstance(): AgentEngine {
    if (!AgentEngine.instance) {
      AgentEngine.instance = new AgentEngine();
    }
    return AgentEngine.instance;
  }

  public subscribe(listener: AgentEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: Omit<AgentEvent, 'timestamp'>): void {
    const fullEvent: AgentEvent = {
      ...event,
      timestamp: Date.now(),
    };
    this.listeners.forEach((l) => {
      try {
        l(fullEvent);
      } catch (err) {
        console.warn('[AgentEngine] Listener error:', err);
      }
    });
  }

  public getStatus(): AgentStatus {
    return this.status;
  }

  public getCurrentTask(): AgentTask | null {
    return this.currentTask;
  }

  public getPlan(): AgentStep[] {
    return this.currentTask ? this.currentTask.steps : [];
  }

  public getHistory(): AgentTask[] {
    return this.taskManager.getAllTasks();
  }

  /**
   * Start autonomous agent task for a natural language goal.
   */
  public async start(goal: string): Promise<AgentFinalResult> {
    const cleanGoal = (goal || '').trim();
    if (!cleanGoal) {
      return {
        summary: 'No goal provided to Agent.',
        success: false,
        completedStepsCount: 0,
        failedStepsCount: 0,
      };
    }

    this.isCancelled = false;
    this.isPaused = false;
    this.status = 'planning';

    // 1. Plan creation
    this.emit({
      type: 'planning',
      taskId: 'pending',
      message: `Formulating action plan for goal: "${cleanGoal}"...`,
    });

    const { task, steps } = await this.planner.createPlan(cleanGoal);
    this.currentTask = task;
    this.taskManager.createTask(task);

    this.emit({
      type: 'plan_ready',
      taskId: task.id,
      task,
      message: `Action plan created with ${steps.length} step(s).`,
    });

    this.taskManager.appendAuditLog(task.id, {
      eventType: 'plan_formulated',
      status: 'success',
      details: `Formulated ${steps.length} steps.`,
    });

    // 2. Sequential Step Execution
    return await this.executeLoop(task);
  }

  private async executeLoop(task: AgentTask): Promise<AgentFinalResult> {
    this.status = 'executing';
    task.status = 'executing';
    this.taskManager.updateTask(task);

    let completedSteps = 0;
    let failedSteps = 0;

    for (let i = task.currentStepIndex; i < task.steps.length; i++) {
      task.currentStepIndex = i;
      const step = task.steps[i];

      if (this.isCancelled) {
        this.status = 'cancelled';
        task.status = 'cancelled';
        this.taskManager.updateTask(task);
        this.emit({
          type: 'cancelled',
          taskId: task.id,
          task,
          message: 'Agent task was halted by user.',
        });
        return {
          summary: 'Agent was stopped by user instruction.',
          success: false,
          completedStepsCount: completedSteps,
          failedStepsCount: failedSteps,
        };
      }

      // Check if paused
      while (this.isPaused && !this.isCancelled) {
        this.status = 'paused';
        task.status = 'paused';
        this.taskManager.updateTask(task);
        await new Promise((r) => setTimeout(r, 500));
      }

      this.emit({
        type: 'step_started',
        taskId: task.id,
        task,
        step,
        message: `Executing step ${i + 1}/${task.steps.length}: ${step.description}`,
      });

      const outcome = await this.executor.executeStep(
        task,
        i,
        () => this.isCancelled,
        (updatedStep) => {
          task.steps[i] = updatedStep;
          this.taskManager.updateTask(task);
          this.emit({
            type: 'step_completed',
            taskId: task.id,
            task,
            step: updatedStep,
          });
        }
      );

      // Handle confirmation requirement
      if (outcome.needsConfirmation) {
        this.status = 'waiting_confirmation';
        task.status = 'needs_confirmation';
        this.taskManager.updateTask(task);
        this.emit({
          type: 'waiting_confirmation',
          taskId: task.id,
          task,
          step,
          message: `Step requires explicit confirmation: ${step.description}`,
        });

        // Suspend loop until confirmation is handled
        return {
          summary: `Task suspended awaiting confirmation for step: ${step.description}`,
          success: false,
          completedStepsCount: completedSteps,
          failedStepsCount: failedSteps,
        };
      }

      if (outcome.success) {
        completedSteps += 1;
        this.taskManager.appendAuditLog(task.id, {
          stepId: step.id,
          eventType: 'step_verified',
          tool: step.tool,
          argumentsSummary: JSON.stringify(step.arguments),
          status: 'success',
          details: step.verification?.evidence || 'Step completed and verified.',
        });
      } else {
        failedSteps += 1;
        this.taskManager.appendAuditLog(task.id, {
          stepId: step.id,
          eventType: 'step_failed',
          tool: step.tool,
          argumentsSummary: JSON.stringify(step.arguments),
          status: 'failed',
          details: step.error?.message || 'Step execution or verification failed.',
        });

        // If step failed and capability is unsupported, halt gracefully
        if (step.error?.type === 'UNSUPPORTED_CAPABILITY') {
          this.status = 'failed';
          task.status = 'failed';
          const finalResult: AgentFinalResult = {
            summary: `Capability unavailable: ${step.error.message}`,
            success: false,
            warnings: ['Desktop / native OS level automation requires native daemon.'],
            completedStepsCount: completedSteps,
            failedStepsCount: failedSteps,
          };
          task.finalResult = finalResult;
          this.taskManager.updateTask(task);
          this.emit({
            type: 'failed',
            taskId: task.id,
            task,
            message: finalResult.summary,
          });
          return finalResult;
        }
      }
    }

    const overallSuccess = failedSteps === 0 && completedSteps > 0;
    this.status = overallSuccess ? 'completed' : 'failed';
    task.status = overallSuccess ? 'completed' : 'failed';

    let outcomeSummary = '';
    if (overallSuccess) {
      const lastStep = task.steps[task.steps.length - 1];
      if (lastStep?.observation?.whatHappened) {
        outcomeSummary = `Completed ${completedSteps} step(s) for "${task.goal}": ${lastStep.observation.whatHappened}`;
      } else {
        outcomeSummary = `Successfully executed ${completedSteps} step(s) for goal "${task.goal}".`;
      }
    } else {
      outcomeSummary = `Task partially completed: ${completedSteps} step(s) succeeded, ${failedSteps} step(s) failed.`;
    }

    const finalResult: AgentFinalResult = {
      summary: outcomeSummary,
      success: overallSuccess,
      completedStepsCount: completedSteps,
      failedStepsCount: failedSteps,
    };

    task.finalResult = finalResult;
    this.taskManager.updateTask(task);

    this.emit({
      type: overallSuccess ? 'completed' : 'failed',
      taskId: task.id,
      task,
      message: finalResult.summary,
    });

    return finalResult;
  }

  /**
   * User confirms a high-risk or critical step.
   */
  public async confirmStep(taskId: string, stepId: string): Promise<void> {
    if (!this.currentTask || this.currentTask.id !== taskId) return;
    const step = this.currentTask.steps.find((s) => s.id === stepId);
    if (!step) return;

    this.currentTask.activeConfirmation = undefined;
    step.status = 'pending';
    // Bypass permission check for this explicitly approved step execution
    step.permissionLevel = 'LOW_RISK';

    this.emit({
      type: 'confirmation_resolved',
      taskId,
      task: this.currentTask,
      step,
      message: 'User approved action.',
    });

    await this.executeLoop(this.currentTask);
  }

  /**
   * User rejects a high-risk or critical step.
   */
  public rejectStep(taskId: string, stepId: string): void {
    if (!this.currentTask || this.currentTask.id !== taskId) return;
    const step = this.currentTask.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = 'cancelled';
      step.error = {
        type: 'PERMISSION_DENIED',
        message: 'Action rejected by user.',
        retryable: false,
      };
    }
    this.currentTask.activeConfirmation = undefined;
    this.currentTask.status = 'cancelled';
    this.status = 'cancelled';
    this.taskManager.updateTask(this.currentTask);

    this.emit({
      type: 'cancelled',
      taskId,
      task: this.currentTask,
      message: 'User declined action permission.',
    });
  }

  public pause(): void {
    this.isPaused = true;
    this.status = 'paused';
    if (this.currentTask) {
      this.currentTask.status = 'paused';
      this.taskManager.updateTask(this.currentTask);
    }
    this.emit({
      type: 'paused',
      taskId: this.currentTask?.id || 'none',
      message: 'Agent paused.',
    });
  }

  public resume(): void {
    this.isPaused = false;
    this.status = 'executing';
    if (this.currentTask) {
      this.currentTask.status = 'executing';
      this.taskManager.updateTask(this.currentTask);
      this.executeLoop(this.currentTask);
    }
    this.emit({
      type: 'resumed',
      taskId: this.currentTask?.id || 'none',
      message: 'Agent resumed.',
    });
  }

  /**
   * Immediate EMERGENCY STOP: halts execution, sets status to cancelled, and blocks new tool calls.
   */
  public stop(): void {
    this.isCancelled = true;
    this.isPaused = false;
    this.status = 'cancelled';

    if (this.currentTask) {
      this.currentTask.status = 'cancelled';
      this.taskManager.updateTask(this.currentTask);
    }

    this.emit({
      type: 'cancelled',
      taskId: this.currentTask?.id || 'none',
      task: this.currentTask || undefined,
      message: 'AGENT STOPPED immediately by user emergency stop.',
    });
  }
}
