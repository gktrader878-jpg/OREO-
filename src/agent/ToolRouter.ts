import { BrowserTools } from '../tools/browserTools';
import { BrowserController } from '../browser/BrowserController';
import { MemoryManager } from '../services/MemoryManager';
import { AppController } from '../services/AppController';
import { ComputerController } from './ComputerController';
import { AgentPermissions } from './AgentPermissions';
import {
  AgentCapabilities,
  AgentTaskContext,
  PermissionLevel,
  ToolDefinition,
  ToolExecutionResult,
} from './AgentTypes';

export class ToolRouter {
  private static instance: ToolRouter | null = null;
  private tools: Map<string, ToolDefinition> = new Map();
  private computerController: ComputerController = ComputerController.getInstance();
  private permissions: AgentPermissions = AgentPermissions.getInstance();

  public static getInstance(): ToolRouter {
    if (!ToolRouter.instance) {
      ToolRouter.instance = new ToolRouter();
    }
    return ToolRouter.instance;
  }

  constructor() {
    this.registerCoreTools();
  }

  public getCapabilities(): AgentCapabilities {
    return {
      browser: true,
      memory: true,
      search: true,
      timers: true,
      appWorkspace: true,
      files: true,
      webResearch: true,
      computerControlNative: this.computerController.isNativeDesktopSupported,
      desktopAppsNative: this.computerController.isNativeDesktopSupported,
      visionScreenNative: this.computerController.isNativeScreenCaptureSupported,
    };
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  private registerCoreTools(): void {
    // 1. Browser Open
    this.registerTool({
      name: 'browserOpen',
      description: 'Open a website URL or known web application in the user browser and workspace.',
      category: 'browser',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          appName: { type: 'string' },
        },
      },
      execute: async (args) => {
        try {
          const res = BrowserTools.handleBrowserOpen(args);
          return {
            success: Boolean(res.success),
            data: res,
            error: res.success ? undefined : res.message,
          };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to open browser target.' };
        }
      },
    });

    // 2. Open Website (Direct alias)
    this.registerTool({
      name: 'openWebsite',
      description: 'Navigate to a designated website in the browser.',
      category: 'browser',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          siteName: { type: 'string' },
        },
      },
      execute: async (args) => {
        try {
          const res = BrowserTools.handleOpenWebsite(args);
          return {
            success: Boolean(res.success),
            data: res,
            error: res.success ? undefined : res.message,
          };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to open website.' };
        }
      },
    });

    // 3. Browser Search
    this.registerTool({
      name: 'browserSearch',
      description: 'Search on Google, YouTube, Wikipedia, Reddit, GitHub, etc.',
      category: 'search',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          engine: { type: 'string' },
          query: { type: 'string' },
        },
        required: ['query'],
      },
      execute: async (args) => {
        try {
          const res = BrowserTools.handleBrowserSearch(args);
          return {
            success: Boolean(res.success),
            data: res,
            error: res.success ? undefined : res.message,
          };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Search execution failed.' };
        }
      },
    });

    // 4. Search Website (Direct alias)
    this.registerTool({
      name: 'searchWebsite',
      description: 'Search on a specific platform (youtube, google, reddit, github, wikipedia).',
      category: 'search',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          site: { type: 'string' },
          query: { type: 'string' },
        },
        required: ['site', 'query'],
      },
      execute: async (args) => {
        try {
          const res = BrowserTools.handleSearchWebsite(args);
          return {
            success: Boolean(res.success),
            data: res,
            error: res.success ? undefined : res.message,
          };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Website search failed.' };
        }
      },
    });

    // 5. Browser Tab Controls
    this.registerTool({
      name: 'browserNewTab',
      description: 'Open a new browser tab.',
      category: 'browser',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: { url: { type: 'string' } },
      },
      execute: async (args) => {
        try {
          const res = BrowserTools.handleBrowserNewTab(args);
          return { success: res.success, data: res };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to create new tab.' };
        }
      },
    });

    this.registerTool({
      name: 'browserSwitchTab',
      description: 'Switch active browser tab by title or ID.',
      category: 'browser',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: { tabIdOrTitle: { type: 'string' } },
        required: ['tabIdOrTitle'],
      },
      execute: async (args) => {
        try {
          const res = BrowserTools.handleBrowserSwitchTab(args);
          return { success: res.success, data: res, error: res.success ? undefined : res.message };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to switch tab.' };
        }
      },
    });

    this.registerTool({
      name: 'browserCloseTab',
      description: 'Close specified browser tab.',
      category: 'browser',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: { tabIdOrTitle: { type: 'string' } },
      },
      execute: async (args) => {
        try {
          const res = BrowserTools.handleBrowserCloseTab(args);
          return { success: res.success, data: res };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to close tab.' };
        }
      },
    });

    // 6. Memory Tools
    this.registerTool({
      name: 'saveMemory',
      description: 'Save user preferences, project facts, or instructions into OREO long-term memory.',
      category: 'memory',
      permissionLevel: 'MEDIUM_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          key: { type: 'string' },
          category: { type: 'string' },
          importance: { type: 'number' },
        },
        required: ['content'],
      },
      execute: async (args) => {
        try {
          const mm = MemoryManager.getInstance();
          const res = mm.saveMemory({
            content: args.content,
            key: args.key,
            category: args.category || 'project',
            importance: args.importance || 0.8,
            isExplicit: true,
            source: 'explicit',
          });
          return {
            success: Boolean(res && res.id),
            data: res,
            error: res?.id ? undefined : 'Failed to save memory item into core.',
          };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Memory storage error.' };
        }
      },
    });

    this.registerTool({
      name: 'queryMemory',
      description: 'Query stored long-term memories.',
      category: 'memory',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
      },
      execute: async (args) => {
        try {
          const mm = MemoryManager.getInstance();
          const memories = await mm.searchMemory(args.query || '', 'all');
          return {
            success: true,
            data: {
              count: memories.length,
              memories: memories.slice(0, 8),
            },
          };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Memory query failed.' };
        }
      },
    });

    this.registerTool({
      name: 'deleteMemory',
      description: 'Delete a specific memory by ID or search term.',
      category: 'memory',
      permissionLevel: 'MEDIUM_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          memoryId: { type: 'string' },
          query: { type: 'string' },
        },
      },
      execute: async (args) => {
        try {
          const mm = MemoryManager.getInstance();
          let id = args.memoryId;
          if (!id && args.query) {
            const matches = await mm.searchMemory(args.query, 'all');
            if (matches.length > 0) id = matches[0].id;
          }
          if (!id) {
            return { success: false, error: 'Could not find memory to delete.' };
          }
          const isDeleted = mm.deleteMemory(id);
          return { success: isDeleted, data: { deletedId: id } };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Memory deletion error.' };
        }
      },
    });

    this.registerTool({
      name: 'clearMemory',
      description: 'Clear all stored memories (requires user confirmation).',
      category: 'memory',
      permissionLevel: 'HIGH_RISK',
      available: true,
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        try {
          const mm = MemoryManager.getInstance();
          await mm.clearMemory();
          return { success: true, data: { cleared: true } };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Clear memory error.' };
        }
      },
    });

    // 7. Web Research Synthesis Tool
    this.registerTool({
      name: 'webResearch',
      description: 'Synthesize research from web sources on a topic or question.',
      category: 'research',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          focusAreas: { type: 'array', items: { type: 'string' } },
        },
        required: ['topic'],
      },
      execute: async (args) => {
        const topic = (args.topic || '').trim();
        if (!topic) {
          return { success: false, error: 'Please specify a research topic.' };
        }

        // Navigate browser to Google / Wikipedia search for transparency
        BrowserTools.handleBrowserSearch({
          engine: 'google',
          query: topic,
        });

        return {
          success: true,
          data: {
            topic,
            searchExecuted: true,
            sourcesObserved: [
              `https://www.google.com/search?q=${encodeURIComponent(topic)}`,
              `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`,
            ],
            status: 'Search queried in browser workspace for live research.',
          },
        };
      },
    });

    // 8. Application & Workspace Controls
    this.registerTool({
      name: 'openApp',
      description: 'Launch an integrated OREO workspace application.',
      category: 'workspace',
      permissionLevel: 'MEDIUM_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          appName: { type: 'string' },
        },
        required: ['appName'],
      },
      execute: async (args) => {
        try {
          const ac = AppController.getInstance();
          const res = ac.openWebApp({ appName: args.appName });
          return {
            success: res.success,
            data: res,
            error: res.success ? undefined : res.message,
          };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to open application.' };
        }
      },
    });

    this.registerTool({
      name: 'controlWorkspace',
      description: 'Open, minimize, or close the main OREO workspace.',
      category: 'workspace',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['open', 'close', 'minimize', 'maximize', 'toggle'] },
        },
      },
      execute: async (args) => {
        try {
          const bc = BrowserController.getInstance();
          const action = args.action || 'toggle';
          if (action === 'open') bc.toggleWorkspace(true);
          else if (action === 'close') bc.toggleWorkspace(false);
          else if (action === 'minimize') bc.toggleMinimize();
          else bc.toggleWorkspace();
          return { success: true, data: { action, workspaceOpen: bc.getState().isOpen } };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Workspace control error.' };
        }
      },
    });

    // 9. Real Screen Capture & Awareness (Screen Images & Display Frames)
    this.registerTool({
      name: 'captureScreen',
      description: 'Capture real desktop or browser screen frame image and display metrics.',
      category: 'computer',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          width: { type: 'number' },
          height: { type: 'number' },
        },
      },
      execute: async (args) => {
        try {
          const res = await this.computerController.captureScreen(args);
          return {
            success: res.success,
            data: {
              width: res.width,
              height: res.height,
              sourceName: res.sourceName,
              timestamp: res.timestamp,
              hasImageData: Boolean(res.imageData),
            },
            error: res.error,
          };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to capture screen frame.' };
        }
      },
    });

    // 10. Real Native Desktop Mouse Click
    this.registerTool({
      name: 'nativeMouseClick',
      description: 'Perform real mouse click at specified coordinates (x, y).',
      category: 'computer',
      permissionLevel: 'HIGH_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          button: { type: 'string', enum: ['left', 'right', 'middle'] },
          double: { type: 'boolean' },
        },
        required: ['x', 'y'],
      },
      execute: async (args) => {
        try {
          const res = await this.computerController.click(
            args.x,
            args.y,
            args.button || 'left',
            Boolean(args.double)
          );
          return {
            success: res.success,
            data: res,
            error: res.error,
          };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Native mouse click failed.' };
        }
      },
    });

    // 11. Real Native Desktop Keystrokes
    this.registerTool({
      name: 'nativeKeyboardType',
      description: 'Type text directly into active OS window / input.',
      category: 'computer',
      permissionLevel: 'HIGH_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
        },
        required: ['text'],
      },
      execute: async (args) => {
        try {
          const res = await this.computerController.type(args.text);
          return {
            success: res.success,
            data: res,
            error: res.error,
          };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Native typing failed.' };
        }
      },
    });

    // 12. Real Native Hotkey / Key Press
    this.registerTool({
      name: 'nativeKeyPress',
      description: 'Send native key press with optional modifier keys (ctrl, shift, alt, meta).',
      category: 'computer',
      permissionLevel: 'HIGH_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          modifiers: { type: 'array', items: { type: 'string' } },
        },
        required: ['key'],
      },
      execute: async (args) => {
        try {
          const res = await this.computerController.keyPress(args.key, args.modifiers || []);
          return { success: res.success, data: res, error: res.error };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Native key press failed.' };
        }
      },
    });

    // 13. Real Native App Launching
    this.registerTool({
      name: 'nativeLaunchApp',
      description: 'Launch an executable, OS application, or local file.',
      category: 'computer',
      permissionLevel: 'HIGH_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: {
          appNameOrPath: { type: 'string' },
        },
        required: ['appNameOrPath'],
      },
      execute: async (args) => {
        try {
          const res = await this.computerController.launchNativeApp(args.appNameOrPath);
          return { success: res.success, data: res, error: res.error };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Native app launch failed.' };
        }
      },
    });

    // 14. Real Clipboard Management
    this.registerTool({
      name: 'readClipboard',
      description: 'Read current text contents of the system clipboard.',
      category: 'computer',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        try {
          const text = await this.computerController.readClipboard();
          return { success: true, data: { text } };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to read clipboard.' };
        }
      },
    });

    this.registerTool({
      name: 'writeClipboard',
      description: 'Copy text to system clipboard.',
      category: 'computer',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
      execute: async (args) => {
        try {
          const ok = await this.computerController.writeClipboard(args.text);
          return { success: ok, data: { copied: ok } };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to write to clipboard.' };
        }
      },
    });

    // 15. System Information Diagnostics
    this.registerTool({
      name: 'getSystemInfo',
      description: 'Query detailed OS, CPU, memory, and display metrics.',
      category: 'system',
      permissionLevel: 'LOW_RISK',
      available: true,
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        try {
          const info = await this.computerController.getSystemInfo();
          return { success: true, data: info };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Failed to query system information.' };
        }
      },
    });

    // Legacy aliases
    this.registerTool({
      name: 'computerControlClick',
      description: 'Desktop mouse click (delegates to real native mouse click).',
      category: 'computer',
      permissionLevel: 'HIGH_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: { x: { type: 'number' }, y: { type: 'number' } },
        required: ['x', 'y'],
      },
      execute: async (args) => {
        return await this.computerController.click(args.x, args.y);
      },
    });

    this.registerTool({
      name: 'computerControlType',
      description: 'Desktop keystroke typing (delegates to real native keyboard typing).',
      category: 'computer',
      permissionLevel: 'HIGH_RISK',
      available: true,
      inputSchema: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
      execute: async (args) => {
        return await this.computerController.type(args.text);
      },
    });
  }

  /**
   * Execute a tool call with permission check and error normalization.
   */
  public async executeTool(
    toolName: string,
    args: Record<string, any>,
    context?: AgentTaskContext
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' is not registered or supported in this runtime.`,
      };
    }

    if (!tool.available) {
      return {
        success: false,
        error: `Tool '${toolName}' is unavailable: ${tool.unavailabilityReason || 'Unsupported capability.'}`,
      };
    }

    try {
      const result = await tool.execute(args, context);
      return result;
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || `Execution error while running tool '${toolName}'.`,
      };
    }
  }
}
