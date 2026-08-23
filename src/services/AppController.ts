import { WorkspaceState, WorkspaceTab } from '../types';
import { AppRegistry } from './AppRegistry';

export type WorkspaceChangeListener = (state: WorkspaceState) => void;

export class AppController {
  private static instance: AppController | null = null;
  private state: WorkspaceState = {
    isOpen: false,
    isMinimized: false,
    isFullscreen: false,
    tabs: [],
    activeTabId: null,
  };
  private listeners: Set<WorkspaceChangeListener> = new Set();

  private constructor() {}

  public static getInstance(): AppController {
    if (!AppController.instance) {
      AppController.instance = new AppController();
    }
    return AppController.instance;
  }

  public getState(): WorkspaceState {
    return { ...this.state };
  }

  public subscribe(listener: WorkspaceChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((l) => l(currentState));
  }

  /**
   * Open a web application inside the workspace or launch in a new browser tab.
   */
  public openWebApp(params: {
    appName?: string;
    url?: string;
    mode?: 'embedded' | 'new-tab';
  }): {
    success: boolean;
    tabId?: string;
    action: 'opened_in_workspace' | 'opened_in_new_tab' | 'switched_to_existing';
    appName: string;
    url: string;
    canEmbed: boolean;
    message: string;
  } {
    const query = params.url || params.appName || '';
    const resolved = AppRegistry.resolveUrl(query, params.appName);

    // If explicit new-tab requested
    if (params.mode === 'new-tab') {
      const opened = this.openNewTab(resolved.url);
      return {
        success: true,
        action: 'opened_in_new_tab',
        appName: resolved.appName,
        url: resolved.url,
        canEmbed: resolved.canEmbed,
        message: opened
          ? `Opened ${resolved.appName} in a new browser tab.`
          : `Initiated navigation to ${resolved.appName}.`,
      };
    }

    // Check if tab with identical URL already exists
    const existingTab = this.state.tabs.find(
      (t) => t.url.toLowerCase() === resolved.url.toLowerCase() || t.appName.toLowerCase() === resolved.appName.toLowerCase()
    );

    if (existingTab) {
      this.state.activeTabId = existingTab.id;
      this.state.isOpen = true;
      this.state.isMinimized = false;
      this.notify();

      return {
        success: true,
        tabId: existingTab.id,
        action: 'switched_to_existing',
        appName: existingTab.appName,
        url: existingTab.url,
        canEmbed: !existingTab.isEmbedBlocked,
        message: `Switched to active workspace tab for ${existingTab.appName}.`,
      };
    }

    // Create new tab in workspace
    const newTabId = Math.random().toString(36).substring(2, 9);
    const newTab: WorkspaceTab = {
      id: newTabId,
      appName: resolved.appName,
      url: resolved.url,
      title: resolved.appName,
      iconName: resolved.icon,
      isLoading: true,
      isEmbedBlocked: !resolved.canEmbed,
      openedAt: Date.now(),
    };

    this.state.tabs.push(newTab);
    this.state.activeTabId = newTabId;
    this.state.isOpen = true;
    this.state.isMinimized = false;
    this.notify();

    return {
      success: true,
      tabId: newTabId,
      action: 'opened_in_workspace',
      appName: resolved.appName,
      url: resolved.url,
      canEmbed: resolved.canEmbed,
      message: `Opened ${resolved.appName} in OREO App Workspace.`,
    };
  }

  /**
   * Handle desktop application opening requests.
   * Browsers cannot spawn arbitrary native desktop binaries without native OS hooks.
   */
  public openDesktopApp(appName: string): {
    success: boolean;
    isDesktop: true;
    message: string;
  } {
    return {
      success: false,
      isDesktop: true,
      message: `I can open web applications in your browser workspace. Opening the installed desktop version of ${appName} requires OS-level integration (e.g. native electron/daemon runtime).`,
    };
  }

  /**
   * Directly open URL in a new browser tab.
   */
  public openNewTab(url: string): boolean {
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return !!win;
    } catch (e) {
      console.warn('[AppController] Failed to open new tab directly:', e);
      return false;
    }
  }

  /**
   * Switch focus to a specific tab by ID or app name.
   */
  public focusApp(tabIdOrName: string): { success: boolean; message: string; activeTab?: WorkspaceTab } {
    const key = tabIdOrName.toLowerCase().trim();
    const tab = this.state.tabs.find(
      (t) => t.id === tabIdOrName || t.appName.toLowerCase() === key || t.title.toLowerCase().includes(key)
    );

    if (!tab) {
      return { success: false, message: `No open tab found matching "${tabIdOrName}".` };
    }

    this.state.activeTabId = tab.id;
    this.state.isOpen = true;
    this.state.isMinimized = false;
    this.notify();

    return {
      success: true,
      activeTab: tab,
      message: `Switched to ${tab.appName}.`,
    };
  }

  /**
   * Close a specific tab or the active tab.
   */
  public closeApp(tabIdOrName?: string): { success: boolean; message: string; remainingTabsCount: number } {
    if (this.state.tabs.length === 0) {
      this.state.isOpen = false;
      this.notify();
      return { success: false, message: 'No active workspace tabs to close.', remainingTabsCount: 0 };
    }

    let targetTabId = this.state.activeTabId;

    if (tabIdOrName) {
      const key = tabIdOrName.toLowerCase().trim();
      const tab = this.state.tabs.find(
        (t) => t.id === tabIdOrName || t.appName.toLowerCase() === key || t.title.toLowerCase().includes(key)
      );
      if (tab) targetTabId = tab.id;
    }

    if (!targetTabId) {
      targetTabId = this.state.tabs[this.state.tabs.length - 1].id;
    }

    const closedTab = this.state.tabs.find((t) => t.id === targetTabId);
    this.state.tabs = this.state.tabs.filter((t) => t.id !== targetTabId);

    if (this.state.tabs.length === 0) {
      this.state.activeTabId = null;
      this.state.isOpen = false;
    } else if (this.state.activeTabId === targetTabId) {
      this.state.activeTabId = this.state.tabs[this.state.tabs.length - 1].id;
    }

    this.notify();

    return {
      success: true,
      message: closedTab ? `Closed ${closedTab.appName}.` : 'Closed workspace tab.',
      remainingTabsCount: this.state.tabs.length,
    };
  }

  /**
   * Reload active or specified tab.
   */
  public reloadApp(tabId?: string): { success: boolean; message: string } {
    const id = tabId || this.state.activeTabId;
    const tab = this.state.tabs.find((t) => t.id === id);

    if (!tab) {
      return { success: false, message: 'No active tab to reload.' };
    }

    tab.isLoading = true;
    this.notify();

    // Trigger simulate load completion
    setTimeout(() => {
      if (tab) {
        tab.isLoading = false;
        this.notify();
      }
    }, 600);

    return { success: true, message: `Reloaded ${tab.appName}.` };
  }

  /**
   * Navigate tab to another URL.
   */
  public navigateApp(url: string, tabId?: string): { success: boolean; message: string; url: string } {
    const id = tabId || this.state.activeTabId;
    let tab = this.state.tabs.find((t) => t.id === id);

    const resolved = AppRegistry.resolveUrl(url);

    if (!tab) {
      const openResult = this.openWebApp({ url: resolved.url });
      return { success: openResult.success, message: openResult.message, url: resolved.url };
    }

    tab.url = resolved.url;
    tab.appName = resolved.appName;
    tab.title = resolved.appName;
    tab.iconName = resolved.icon;
    tab.isEmbedBlocked = !resolved.canEmbed;
    tab.isLoading = true;

    this.state.isOpen = true;
    this.state.isMinimized = false;
    this.notify();

    setTimeout(() => {
      if (tab) {
        tab.isLoading = false;
        this.notify();
      }
    }, 500);

    return { success: true, message: `Navigated to ${resolved.appName}.`, url: resolved.url };
  }

  public setTabLoaded(tabId: string, blocked: boolean = false) {
    const tab = this.state.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.isLoading = false;
      tab.isEmbedBlocked = blocked;
      this.notify();
    }
  }

  public toggleMinimize() {
    this.state.isMinimized = !this.state.isMinimized;
    this.notify();
  }

  public toggleFullscreen() {
    this.state.isFullscreen = !this.state.isFullscreen;
    this.notify();
  }

  public closeWorkspace() {
    this.state.isOpen = false;
    this.notify();
  }

  public openWorkspace() {
    if (this.state.tabs.length === 0) {
      // Open default starter tab
      this.openWebApp({ appName: 'YouTube' });
    } else {
      this.state.isOpen = true;
      this.state.isMinimized = false;
      this.notify();
    }
  }
}
