export type AgentStatus =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'verifying'
  | 'retrying'
  | 'waiting_confirmation'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TaskStatus =
  | 'queued'
  | 'planning'
  | 'executing'
  | 'waiting'
  | 'verifying'
  | 'retrying'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'needs_confirmation';

export type StepStatus =
  | 'pending'
  | 'executing'
  | 'observing'
  | 'verifying'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'needs_confirmation'
  | 'skipped';

export type IntentType =
  | 'conversation'
  | 'question'
  | 'web_research'
  | 'browser_action'
  | 'file_task'
  | 'coding_task'
  | 'data_analysis'
  | 'automation'
  | 'multi_step_task'
  | 'memory_task'
  | 'system_action';

export type PermissionLevel = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'CRITICAL';

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface StepObservation {
  whatHappened: string;
  expectedMet: boolean;
  stateDelta: Record<string, any>;
  canProceed: boolean;
  details?: string;
}

export interface VerificationResult {
  verified: boolean;
  evidence: string;
  postConditionMet: boolean;
  issues?: string[];
}

export interface StructuredStepError {
  type:
    | 'NETWORK_ERROR'
    | 'PERMISSION_DENIED'
    | 'UNSUPPORTED_CAPABILITY'
    | 'TIMEOUT'
    | 'EXECUTION_ERROR'
    | 'VERIFICATION_FAILED'
    | 'INVALID_ARGUMENTS'
    | 'USER_CANCELLED';
  message: string;
  retryable: boolean;
  suggestedAction?: string;
}

export interface AgentStep {
  id: string;
  description: string;
  tool: string;
  arguments: Record<string, any>;
  expectedOutcome: string;
  status: StepStatus;
  permissionLevel: PermissionLevel;
  attempts: number;
  maxAttempts: number;
  result?: ToolExecutionResult;
  observation?: StepObservation;
  verification?: VerificationResult;
  error?: StructuredStepError;
  startedAt?: number;
  completedAt?: number;
}

export interface AgentTaskContext {
  relevantMemories: string[];
  userPreferences: Record<string, any>;
  environmentInfo: Record<string, any>;
  intermediateVariables: Record<string, any>;
}

export interface AgentAuditEntry {
  id: string;
  stepId?: string;
  timestamp: number;
  eventType: string;
  tool?: string;
  argumentsSummary?: string;
  status: string;
  details?: string;
}

export interface AgentFinalResult {
  summary: string;
  success: boolean;
  warnings?: string[];
  completedStepsCount: number;
  failedStepsCount: number;
  data?: any;
}

export interface AgentTask {
  id: string;
  goal: string;
  intent: IntentType;
  steps: AgentStep[];
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  currentStepIndex: number;
  context: AgentTaskContext;
  auditLog: AgentAuditEntry[];
  finalResult?: AgentFinalResult;
  activeConfirmation?: {
    stepId: string;
    action: string;
    reason: string;
    permissionLevel: PermissionLevel;
  };
}

export type AgentEventType =
  | 'task_created'
  | 'planning'
  | 'plan_ready'
  | 'step_started'
  | 'tool_called'
  | 'tool_result'
  | 'observing'
  | 'verification_started'
  | 'verification_result'
  | 'retry'
  | 'waiting_confirmation'
  | 'confirmation_resolved'
  | 'step_completed'
  | 'step_failed'
  | 'paused'
  | 'resumed'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'log';

export interface AgentEvent {
  type: AgentEventType;
  taskId: string;
  task?: AgentTask;
  step?: AgentStep;
  data?: any;
  message?: string;
  timestamp: number;
}

export interface AgentCapabilities {
  browser: boolean;
  memory: boolean;
  search: boolean;
  timers: boolean;
  appWorkspace: boolean;
  files: boolean;
  webResearch: boolean;
  computerControlNative: boolean;
  desktopAppsNative: boolean;
  visionScreenNative: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'browser' | 'memory' | 'search' | 'system' | 'workspace' | 'research' | 'computer';
  permissionLevel: PermissionLevel;
  available: boolean;
  unavailabilityReason?: string;
  inputSchema: Record<string, any>;
  execute: (args: Record<string, any>, context?: AgentTaskContext) => Promise<ToolExecutionResult>;
}
