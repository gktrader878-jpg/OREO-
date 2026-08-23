import { ActiveTimer, EmotionState, EmotionType, FunctionCall, FunctionResponse, MemoryCategory, OpenedWebsite, ToolActionLog, VoiceOption, WorkspaceState, WorkspaceTab } from '../types';
import { AppController } from './AppController';
import { AppRegistry } from './AppRegistry';
import { MemoryManager } from './MemoryManager';

export type ToolEventListener = (event: {
  type: 'timer_added' | 'timer_finished' | 'website_opened' | 'tool_executed' | 'voice_change_requested' | 'emotion_changed' | 'workspace_updated' | 'memory_updated';
  data: any;
}) => void;

export class ToolManager {
  private activeTimers: Map<string, ActiveTimer> = new Map();
  private timerIntervals: Map<string, number> = new Map();
  private openedWebsites: OpenedWebsite[] = [];
  private toolLogs: ToolActionLog[] = [];
  private listeners: Set<ToolEventListener> = new Set();
  private onVoiceChangeCallback: ((voice: VoiceOption) => void) | null = null;
  private onEmotionChangeCallback: ((emotion: EmotionState) => void) | null = null;

  constructor(
    onVoiceChange?: (voice: VoiceOption) => void,
    onEmotionChange?: (emotion: EmotionState) => void
  ) {
    if (onVoiceChange) this.onVoiceChangeCallback = onVoiceChange;
    if (onEmotionChange) this.onEmotionChangeCallback = onEmotionChange;
  }

  public subscribe(listener: ToolEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: Parameters<ToolEventListener>[0]) {
    this.listeners.forEach((l) => l(event));
  }

  public setVoiceChangeHandler(handler: (voice: VoiceOption) => void) {
    this.onVoiceChangeCallback = handler;
  }

  public setEmotionChangeHandler(handler: (emotion: EmotionState) => void) {
    this.onEmotionChangeCallback = handler;
  }

  public async executeToolCalls(calls: FunctionCall[]): Promise<FunctionResponse[]> {
    const responses: FunctionResponse[] = [];

    for (const call of calls) {
      console.log(`[ToolManager] Executing function: ${call.name}`, call.args);
      let output: Record<string, any> = {};

      const logEntry: ToolActionLog = {
        id: call.id,
        toolName: call.name,
        args: call.args,
        result: {},
        timestamp: new Date(),
        status: 'executing',
      };

      try {
        switch (call.name) {
          case 'openApp':
            output = this.handleOpenApp(call.args);
            break;

          case 'controlWorkspace':
            output = this.handleControlWorkspace(call.args);
            break;

          case 'openWebsite':
            output = this.handleOpenWebsite(call.args);
            break;

          case 'setTimerOrReminder':
            output = this.handleSetTimer(call.args);
            break;

          case 'getSystemInfo':
            output = this.handleGetSystemInfo(call.args);
            break;

          case 'changeAssistantVoice':
            output = this.handleChangeVoice(call.args);
            break;

          case 'expressEmotion':
            output = this.handleExpressEmotion(call.args);
            break;

          case 'saveMemory':
            output = await this.handleSaveMemory(call.args);
            break;

          case 'queryMemory':
            output = await this.handleQueryMemory(call.args);
            break;

          case 'deleteMemory':
            output = await this.handleDeleteMemory(call.args);
            break;

          case 'clearMemory':
            output = await this.handleClearMemory(call.args);
            break;

          default:
            output = { error: `Tool ${call.name} is not recognized.` };
            break;
        }

        logEntry.result = output;
        logEntry.status = 'success';
      } catch (err: any) {
        console.error(`[ToolManager] Failed to execute ${call.name}:`, err);
        output = { error: err?.message || 'Tool execution failed' };
        logEntry.result = output;
        logEntry.status = 'failed';
      }

      this.toolLogs.unshift(logEntry);
      if (this.toolLogs.length > 50) this.toolLogs.pop();

      this.notify({
        type: 'tool_executed',
        data: logEntry,
      });

      responses.push({
        id: call.id,
        name: call.name,
        response: { output },
      });
    }

    return responses;
  }

  private handleOpenApp(args: { appName?: string; url?: string; mode?: 'embedded' | 'new-tab' }): Record<string, any> {
    const rawAppName = (args.appName || '').trim();
    const rawUrl = (args.url || '').trim();

    if (!rawAppName && !rawUrl) {
      return {
        success: false,
        message: 'Please specify an application name (e.g., YouTube, Google, Gmail, Spotify) or a website URL.',
      };
    }

    // Check if user requested a known strictly desktop-native application
    if (rawAppName && AppRegistry.isDesktopOnlyApp(rawAppName)) {
      return AppController.getInstance().openDesktopApp(rawAppName);
    }

    const appController = AppController.getInstance();
    const result = appController.openWebApp({
      appName: rawAppName,
      url: rawUrl,
      mode: args.mode,
    });

    const openedItem: OpenedWebsite = {
      id: result.tabId || Math.random().toString(36).substring(2, 9),
      url: result.url,
      title: result.appName,
      openedAt: new Date(),
    };

    this.openedWebsites.unshift(openedItem);
    if (this.openedWebsites.length > 20) this.openedWebsites.pop();

    this.notify({
      type: 'workspace_updated',
      data: appController.getState(),
    });

    return {
      success: result.success,
      appName: result.appName,
      url: result.url,
      action: result.action,
      canEmbed: result.canEmbed,
      message: result.message,
    };
  }

  private handleControlWorkspace(args: {
    action?: 'close' | 'switch' | 'reload' | 'new_tab' | 'minimize' | 'maximize' | 'navigate';
    targetApp?: string;
    url?: string;
  }): Record<string, any> {
    const appController = AppController.getInstance();
    const action = (args.action || 'switch').toLowerCase();
    const target = args.targetApp || '';

    switch (action) {
      case 'close': {
        const res = appController.closeApp(target);
        this.notify({ type: 'workspace_updated', data: appController.getState() });
        return res;
      }

      case 'switch':
      case 'focus': {
        const res = appController.focusApp(target);
        this.notify({ type: 'workspace_updated', data: appController.getState() });
        return res;
      }

      case 'reload':
      case 'refresh': {
        const res = appController.reloadApp();
        this.notify({ type: 'workspace_updated', data: appController.getState() });
        return res;
      }

      case 'new_tab':
      case 'open_new_tab': {
        const state = appController.getState();
        const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
        const urlToOpen = args.url || activeTab?.url || 'https://www.google.com';
        const opened = appController.openNewTab(urlToOpen);
        return {
          success: opened,
          url: urlToOpen,
          message: opened
            ? `Opened ${activeTab?.appName || urlToOpen} in a new browser tab.`
            : `Attempted to open new tab for ${urlToOpen}.`,
        };
      }

      case 'minimize': {
        appController.toggleMinimize();
        this.notify({ type: 'workspace_updated', data: appController.getState() });
        return { success: true, message: 'Workspace minimized.' };
      }

      case 'maximize':
      case 'fullscreen': {
        appController.toggleFullscreen();
        this.notify({ type: 'workspace_updated', data: appController.getState() });
        return { success: true, message: 'Workspace toggled fullscreen.' };
      }

      case 'navigate': {
        if (!args.url) return { success: false, message: 'No URL provided to navigate to.' };
        const res = appController.navigateApp(args.url);
        this.notify({ type: 'workspace_updated', data: appController.getState() });
        return res;
      }

      default:
        return { success: false, message: `Unknown workspace action: ${action}` };
    }
  }

  private handleOpenWebsite(args: { url?: string; siteName?: string }): Record<string, any> {
    return this.handleOpenApp({ appName: args.siteName, url: args.url });
  }

  private handleSetTimer(args: { durationSeconds?: number; label?: string }): Record<string, any> {
    const duration = Math.max(1, Math.round(Number(args.durationSeconds) || 60));
    const label = (args.label || 'Timer').trim();
    const id = Math.random().toString(36).substring(2, 9);

    const timer: ActiveTimer = {
      id,
      label,
      totalSeconds: duration,
      remainingSeconds: duration,
      isRunning: true,
      createdAt: Date.now(),
    };

    this.activeTimers.set(id, timer);

    const intervalId = window.setInterval(() => {
      const currentTimer = this.activeTimers.get(id);
      if (!currentTimer || !currentTimer.isRunning) {
        clearInterval(intervalId);
        this.timerIntervals.delete(id);
        return;
      }

      currentTimer.remainingSeconds -= 1;

      if (currentTimer.remainingSeconds <= 0) {
        currentTimer.remainingSeconds = 0;
        currentTimer.isRunning = false;
        clearInterval(intervalId);
        this.timerIntervals.delete(id);

        this.playTimerChime();
        this.notify({
          type: 'timer_finished',
          data: currentTimer,
        });
      } else {
        this.notify({
          type: 'timer_added',
          data: currentTimer,
        });
      }
    }, 1000);

    this.timerIntervals.set(id, intervalId);

    this.notify({
      type: 'timer_added',
      data: timer,
    });

    return {
      success: true,
      timerId: id,
      label,
      durationSeconds: duration,
      message: `Timer for ${label} set for ${duration} seconds.`,
    };
  }

  private handleGetSystemInfo(args: { infoType?: string }): Record<string, any> {
    const now = new Date();
    return {
      success: true,
      currentTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      currentDate: now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: 'online',
      architecture: 'Gemini 3.1 Flash Live (PCM16 16kHz in / 24kHz out)',
      deviceOnline: navigator.onLine,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  private handleChangeVoice(args: { voiceName?: string }): Record<string, any> {
    const requested = (args.voiceName || '').toLowerCase();
    let targetVoice: VoiceOption = 'Puck';

    if (requested.includes('fenrir')) targetVoice = 'Fenrir';
    else if (requested.includes('zephyr')) targetVoice = 'Zephyr';
    else if (requested.includes('charon')) targetVoice = 'Charon';
    else targetVoice = 'Puck';

    if (this.onVoiceChangeCallback) {
      this.onVoiceChangeCallback(targetVoice);
    }

    this.notify({
      type: 'voice_change_requested',
      data: { voice: targetVoice },
    });

    return {
      success: true,
      appliedVoice: targetVoice,
      message: `Voice preset updated to ${targetVoice}`,
    };
  }

  private handleExpressEmotion(args: { emotion?: string; intensity?: number; reason?: string }): Record<string, any> {
    const rawEmotion = (args.emotion || 'neutral').toLowerCase();
    const validEmotions: EmotionType[] = [
      'happy',
      'excited',
      'curious',
      'amused',
      'calm',
      'confident',
      'concerned',
      'empathetic',
      'encouraging',
      'serious',
      'surprised',
      'thoughtful',
      'neutral',
    ];

    let targetEmotion: EmotionType = 'neutral';
    for (const em of validEmotions) {
      if (rawEmotion.includes(em)) {
        targetEmotion = em;
        break;
      }
    }

    const intensity = Math.min(1.0, Math.max(0.0, typeof args.intensity === 'number' ? args.intensity : 0.65));
    const reason = args.reason || 'Contextual shift';

    const emotionState: EmotionState = {
      current: targetEmotion,
      intensity,
      reason,
      updatedAt: Date.now(),
    };

    if (this.onEmotionChangeCallback) {
      this.onEmotionChangeCallback(emotionState);
    }

    this.notify({
      type: 'emotion_changed',
      data: emotionState,
    });

    return {
      success: true,
      emotion: targetEmotion,
      intensity,
      reason,
    };
  }

  private async handleSaveMemory(args: {
    content?: string;
    category?: MemoryCategory;
    key?: string;
    importance?: number;
    isExplicit?: boolean;
    tags?: string[];
  }): Promise<Record<string, any>> {
    const memoryManager = MemoryManager.getInstance();
    const content = (args.content || '').trim();

    if (!content) {
      return {
        success: false,
        message: 'No memory content provided to save.',
      };
    }

    const saved = await memoryManager.addMemory({
      content,
      category: args.category || 'other',
      key: args.key,
      importance: args.importance !== undefined ? args.importance : 0.8,
      isExplicit: args.isExplicit !== undefined ? args.isExplicit : true,
      tags: args.tags,
    });

    this.notify({
      type: 'memory_updated',
      data: saved,
    });

    return {
      success: true,
      savedMemory: {
        id: saved.id,
        key: saved.key,
        category: saved.category,
        content: saved.content,
        importance: saved.importance,
      },
      message: `Memory saved successfully: "${saved.key || saved.content}"`,
    };
  }

  private async handleQueryMemory(args: {
    query?: string;
    category?: MemoryCategory | 'all';
    limit?: number;
  }): Promise<Record<string, any>> {
    const memoryManager = MemoryManager.getInstance();
    const query = args.query || '';
    const category = args.category || 'all';
    const limit = args.limit || 5;

    const results = await memoryManager.searchMemory(query, category);
    const sliced = results.slice(0, limit);

    return {
      success: true,
      count: sliced.length,
      totalFound: results.length,
      memories: sliced.map((m) => ({
        id: m.id,
        key: m.key,
        category: m.category,
        content: m.content,
        importance: m.importance,
      })),
      message: sliced.length > 0 ? `Found ${sliced.length} relevant memories.` : 'No matching memories found.',
    };
  }

  private async handleDeleteMemory(args: {
    query?: string;
    memoryId?: string;
  }): Promise<Record<string, any>> {
    const memoryManager = MemoryManager.getInstance();

    if (args.memoryId) {
      const deleted = await memoryManager.deleteMemory(args.memoryId);
      if (deleted) {
        this.notify({ type: 'memory_updated', data: { deletedId: args.memoryId } });
        return {
          success: true,
          message: `Memory ID ${args.memoryId} deleted successfully.`,
        };
      }
    }

    if (args.query) {
      const result = await memoryManager.deleteMemoryByQuery(args.query);
      if (result.deletedCount > 0) {
        this.notify({ type: 'memory_updated', data: result });
        return {
          success: true,
          deletedCount: result.deletedCount,
          message: `Forgot ${result.deletedCount} memory item(s) matching "${args.query}".`,
        };
      }
      return {
        success: false,
        message: `No memories found matching "${args.query}" to delete.`,
      };
    }

    return {
      success: false,
      message: 'Please provide either a memoryId or search query of the memory to forget.',
    };
  }

  private async handleClearMemory(args: { confirm?: boolean }): Promise<Record<string, any>> {
    if (!args.confirm) {
      return {
        success: false,
        message: 'Clearing memory requires explicit confirmation. Please set confirm to true.',
      };
    }

    const memoryManager = MemoryManager.getInstance();
    await memoryManager.clearMemory();

    this.notify({
      type: 'memory_updated',
      data: { cleared: true },
    });

    return {
      success: true,
      message: 'All stored long-term memories have been permanently cleared.',
    };
  }

  public cancelTimer(id: string): void {
    const interval = this.timerIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.timerIntervals.delete(id);
    }
    this.activeTimers.delete(id);
    this.notify({
      type: 'timer_added',
      data: null,
    });
  }

  public getActiveTimers(): ActiveTimer[] {
    return Array.from(this.activeTimers.values());
  }

  public getOpenedWebsites(): OpenedWebsite[] {
    return this.openedWebsites;
  }

  public getToolLogs(): ToolActionLog[] {
    return this.toolLogs;
  }

  private playTimerChime(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.85);
    } catch (e) {
      // AudioContext might be restricted
    }
  }

  public destroy(): void {
    this.timerIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.timerIntervals.clear();
    this.activeTimers.clear();
    this.listeners.clear();
  }
}
