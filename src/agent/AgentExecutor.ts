import { ToolRouter } from './ToolRouter';
import { AgentObserver } from './AgentObserver';
import { AgentVerifier } from './AgentVerifier';
import { AgentPermissions } from './AgentPermissions';
import {
  AgentStep,
  AgentTask,
  StructuredStepError,
  ToolExecutionResult,
} from './AgentTypes';

export interface StepExecutionOutcome {
  success: boolean;
  step: AgentStep;
  stopped?: boolean;
  needsConfirmation?: boolean;
}

export class AgentExecutor {
  private static instance: AgentExecutor | null = null;
  private toolRouter: ToolRouter = ToolRouter.getInstance();
  private observer: AgentObserver = AgentObserver.getInstance();
  private verifier: AgentVerifier = AgentVerifier.getInstance();
  private permissions: AgentPermissions = AgentPermissions.getInstance();

  public static getInstance(): AgentExecutor {
    if (!AgentExecutor.instance) {
      AgentExecutor.instance = new AgentExecutor();
    }
    return AgentExecutor.instance;
  }

  /**
   * Execute a single step with full Observe -> Verify -> Retry loop.
   */
  public async executeStep(
    task: AgentTask,
    stepIndex: number,
    isCancelledCheck: () => boolean,
    onStepUpdate: (updatedStep: AgentStep) => void
  ): Promise<StepExecutionOutcome> {
    const step = task.steps[stepIndex];
    if (!step) {
      return { success: false, step, stopped: true };
    }

    // 1. Check cancellation before starting
    if (isCancelledCheck()) {
      step.status = 'cancelled';
      onStepUpdate(step);
      return { success: false, step, stopped: true };
    }

    // 2. Check Permission & Confirmation Level
    const evaluatedRisk = this.permissions.evaluateRisk(step.tool, step.arguments);
    step.permissionLevel = evaluatedRisk;

    if (this.permissions.requiresConfirmation(evaluatedRisk)) {
      step.status = 'needs_confirmation';
      task.activeConfirmation = {
        stepId: step.id,
        action: `Execute tool '${step.tool}'`,
        reason: `This action is classified as ${evaluatedRisk} and requires your explicit approval.`,
        permissionLevel: evaluatedRisk,
      };
      onStepUpdate(step);
      return { success: false, step, needsConfirmation: true };
    }

    step.status = 'executing';
    step.startedAt = Date.now();
    onStepUpdate(step);

    let success = false;

    while (step.attempts < step.maxAttempts && !success) {
      if (isCancelledCheck()) {
        step.status = 'cancelled';
        onStepUpdate(step);
        return { success: false, step, stopped: true };
      }

      step.attempts += 1;

      if (step.attempts > 1) {
        step.status = 'retrying';
        onStepUpdate(step);
        // Short pause between retries
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      // 3. EXECUTE TOOL
      let result: ToolExecutionResult;
      try {
        result = await this.toolRouter.executeTool(step.tool, step.arguments, task.context);
      } catch (err: any) {
        result = {
          success: false,
          error: err?.message || 'Tool execution threw an uncaught error.',
        };
      }
      step.result = result;

      // 4. OBSERVE RESULT
      step.status = 'observing';
      onStepUpdate(step);
      const observation = this.observer.observe(step, result);
      step.observation = observation;

      // 5. VERIFY RESULT
      step.status = 'verifying';
      onStepUpdate(step);
      const verification = await this.verifier.verifyStep(step, result, observation);
      step.verification = verification;

      if (verification.verified && verification.postConditionMet) {
        success = true;
        step.status = 'completed';
        step.completedAt = Date.now();
        onStepUpdate(step);
        break;
      } else {
        // Formulate structured error
        const structuredError: StructuredStepError = {
          type: result.error?.includes('UNSUPPORTED')
            ? 'UNSUPPORTED_CAPABILITY'
            : result.error?.includes('PERMISSION')
            ? 'PERMISSION_DENIED'
            : 'EXECUTION_ERROR',
          message: verification.issues?.join('; ') || result.error || 'Verification criteria not met.',
          retryable: step.attempts < step.maxAttempts && !result.error?.includes('UNSUPPORTED'),
          suggestedAction: step.attempts < step.maxAttempts ? 'Retrying with current parameters' : 'Report failure to user',
        };
        step.error = structuredError;

        if (!structuredError.retryable) {
          break;
        }
      }
    }

    if (!success) {
      step.status = 'failed';
      step.completedAt = Date.now();
      onStepUpdate(step);
    }

    return { success, step };
  }
}
