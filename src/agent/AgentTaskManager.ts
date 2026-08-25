import {
  AgentAuditEntry,
  AgentTask,
  TaskStatus,
} from './AgentTypes';

const TASKS_STORAGE_KEY = 'OREO_AGENT_TASKS_STORE';

export class AgentTaskManager {
  private static instance: AgentTaskManager | null = null;
  private tasks: Map<string, AgentTask> = new Map();
  private activeTaskId: string | null = null;

  public static getInstance(): AgentTaskManager {
    if (!AgentTaskManager.instance) {
      AgentTaskManager.instance = new AgentTaskManager();
    }
    return AgentTaskManager.instance;
  }

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(TASKS_STORAGE_KEY);
      if (raw) {
        const parsed: AgentTask[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((t) => {
            if (t.status === 'executing' || t.status === 'planning') {
              t.status = 'paused';
            }
            this.tasks.set(t.id, t);
          });
        }
      }
    } catch (e) {
      console.warn('[AgentTaskManager] Hydration notice:', e);
    }
  }

  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const list = Array.from(this.tasks.values()).slice(-20);
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[AgentTaskManager] Persist error:', e);
    }
  }

  public createTask(task: AgentTask): AgentTask {
    this.tasks.set(task.id, task);
    this.activeTaskId = task.id;
    this.persistToStorage();
    return task;
  }

  public getTask(id: string): AgentTask | undefined {
    return this.tasks.get(id);
  }

  public getActiveTask(): AgentTask | undefined {
    if (this.activeTaskId) {
      return this.tasks.get(this.activeTaskId);
    }
    return undefined;
  }

  public updateTask(task: AgentTask): void {
    task.updatedAt = Date.now();
    this.tasks.set(task.id, task);
    this.persistToStorage();
  }

  public updateTaskStatus(taskId: string, status: TaskStatus): void {
    const t = this.tasks.get(taskId);
    if (t) {
      t.status = status;
      t.updatedAt = Date.now();
      this.persistToStorage();
    }
  }

  public appendAuditLog(taskId: string, entry: Omit<AgentAuditEntry, 'id' | 'timestamp'>): void {
    const t = this.tasks.get(taskId);
    if (t) {
      const fullEntry: AgentAuditEntry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now(),
        ...entry,
      };
      t.auditLog.push(fullEntry);
      this.persistToStorage();
    }
  }

  public getAllTasks(): AgentTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getActiveTasks(): AgentTask[] {
    return this.getAllTasks().filter(
      (t) =>
        t.status === 'planning' ||
        t.status === 'executing' ||
        t.status === 'retrying' ||
        t.status === 'verifying' ||
        t.status === 'needs_confirmation' ||
        t.status === 'paused'
    );
  }

  public clearHistory(): void {
    this.tasks.clear();
    this.activeTaskId = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TASKS_STORAGE_KEY);
    }
  }
}
