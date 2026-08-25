import { PermissionLevel } from './AgentTypes';

export interface ConfirmationRequest {
  id: string;
  taskId: string;
  stepId: string;
  action: string;
  reason: string;
  permissionLevel: PermissionLevel;
  timestamp: number;
}

export class AgentPermissions {
  private static instance: AgentPermissions | null = null;
  private pendingConfirmations: Map<string, ConfirmationRequest> = new Map();

  public static getInstance(): AgentPermissions {
    if (!AgentPermissions.instance) {
      AgentPermissions.instance = new AgentPermissions();
    }
    return AgentPermissions.instance;
  }

  /**
   * Determine the risk level of any tool call.
   */
  public evaluateRisk(toolName: string, args: Record<string, any> = {}): PermissionLevel {
    switch (toolName) {
      // LOW_RISK: Safe informational, browser navigation, search, read-only
      case 'browserSearch':
      case 'searchWebsite':
      case 'openWebsite':
      case 'browserOpen':
      case 'browserBack':
      case 'browserForward':
      case 'browserReload':
      case 'browserNewTab':
      case 'browserSwitchTab':
      case 'openNewBrowserTab':
      case 'getSystemInfo':
      case 'queryMemory':
      case 'webResearch':
      case 'researchTopic':
      case 'listApps':
      case 'getWorkspaceInfo':
      case 'expressEmotion':
        return 'LOW_RISK';

      // MEDIUM_RISK: Local state mutations, saving memories, timers, UI workspace
      case 'saveMemory':
      case 'deleteMemory':
      case 'setTimerOrReminder':
      case 'controlWorkspace':
      case 'openApp':
      case 'changeAssistantVoice':
        return 'MEDIUM_RISK';

      // HIGH_RISK: Mass deletion, external state alteration, closing apps, network mutations
      case 'clearMemory':
      case 'closeApp':
      case 'closeAllTabs':
      case 'externalApiCall':
      case 'installPackage':
      case 'modifyConfigFile':
        return 'HIGH_RISK';

      // CRITICAL: Destructive, security-sensitive, financial, irreversible
      case 'financialPurchase':
      case 'systemWipe':
      case 'credentialExport':
      case 'executeNativeCommand':
      case 'deleteProjectFiles':
        return 'CRITICAL';

      default:
        // By default, unknown tools require MEDIUM risk evaluation
        return 'MEDIUM_RISK';
    }
  }

  /**
   * Determines if a step requires explicit user confirmation.
   * LOW_RISK and MEDIUM_RISK execute automatically unless configured otherwise.
   * HIGH_RISK and CRITICAL ALWAYS require explicit user confirmation.
   */
  public requiresConfirmation(level: PermissionLevel): boolean {
    return level === 'HIGH_RISK' || level === 'CRITICAL';
  }

  /**
   * Register a new confirmation request.
   */
  public createConfirmation(
    taskId: string,
    stepId: string,
    action: string,
    reason: string,
    permissionLevel: PermissionLevel
  ): ConfirmationRequest {
    const req: ConfirmationRequest = {
      id: `conf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      taskId,
      stepId,
      action,
      reason,
      permissionLevel,
      timestamp: Date.now(),
    };
    this.pendingConfirmations.set(req.id, req);
    return req;
  }

  public getPendingConfirmation(id: string): ConfirmationRequest | undefined {
    return this.pendingConfirmations.get(id);
  }

  public removeConfirmation(id: string): void {
    this.pendingConfirmations.delete(id);
  }

  public getAllPending(): ConfirmationRequest[] {
    return Array.from(this.pendingConfirmations.values());
  }
}
