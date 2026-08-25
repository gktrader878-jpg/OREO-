import { BrowserNavigation } from './BrowserNavigation';
import { BrowserRegistry } from './BrowserRegistry';
import { BrowserSearch } from './BrowserSearch';
import { BrowserTab, BrowserTabManager } from './BrowserTabManager';

export interface BrowserWorkspaceState {
  isOpen: boolean;
  isMinimized: boolean;
  isFullscreen: boolean;
  tabs: BrowserTab[];
  activeTabId: string | null;
  activeTab: BrowserTab | null;
  engineMode: 'web-navigation' | 'native-webview';
}

export type BrowserStateListener = (state: BrowserWorkspaceState) => void;

export class BrowserController {
  private static instance: BrowserController | null = null;
  private tabManager: BrowserTabManager = new BrowserTabManager();
  private isOpen: boolean = false;
  private isMinimized: boolean = false;
  private isFullscreen: boolean = false;
  private engineMode: 'web-navigation' | 'native-webview' = 'web-navigation';
  private listeners: Set<BrowserStateListener> = new Set();

  private constructor() {
    // Initialize default starter tab record
    this.tabManager.createTab({
      url: 'https://www.google.com',
      title: 'Google',
      icon: 'Search',
      activate: true,
      lastAction: 'Ready',
    });
  }

  public static getInstance(): BrowserController {
    if (!BrowserController.instance) {
      BrowserController.instance = new BrowserController();
    }
    return BrowserController.instance;
  }

  public getState(): BrowserWorkspaceState {
    const tabs = this.tabManager.getTabs();
    const activeTab = this.tabManager.getActiveTab();
    return {
      isOpen: this.isOpen,
      isMinimized: this.isMinimized,
      isFullscreen: this.isFullscreen,
      tabs,
      activeTabId: activeTab?.id || null,
      activeTab,
      engineMode: this.engineMode,
    };
  }

  public subscribe(listener: BrowserStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  /**
   * Open an official website, web app, or direct URL using REAL browser navigation.
   */
  public open(params: {
    url?: string;
    appName?: string;
    mode?: 'embedded' | 'new-tab';
  }): {
    success: boolean;
    tabId?: string;
    url: string;
    title: string;
    openedInExternalTab: boolean;
    message: string;
  } {
    const query = params.url || params.appName || 'https://www.google.com';
    const norm = BrowserNavigation.normalizeUrl(query);
    const resolved = BrowserRegistry.resolveUrl(norm.url, params.appName);

    // Execute real browser navigation in client window
    const opened = BrowserNavigation.openInExternalTab(resolved.url);

    // Check if matching tab already exists in OREO workspace
    const existing = this.tabManager.getTabs().find(
      (t) =>
        t.url.toLowerCase() === resolved.url.toLowerCase() ||
        t.title.toLowerCase() === resolved.appName.toLowerCase()
    );

    let activeTabId: string;
    if (existing) {
      this.tabManager.switchTab(existing.id);
      activeTabId = existing.id;
    } else {
      const tab = this.tabManager.createTab({
        url: resolved.url,
        title: resolved.appName,
        icon: resolved.icon,
        activate: true,
        lastAction: 'Opened',
      });
      activeTabId = tab.id;
    }

    this.isOpen = true;
    this.isMinimized = false;
    this.notify();

    return {
      success: true,
      tabId: activeTabId,
      url: resolved.url,
      title: resolved.appName,
      openedInExternalTab: true,
      message: opened
        ? `Opened ${resolved.appName} in your browser.`
        : `Launched navigation to ${resolved.appName} (${resolved.url}).`,
    };
  }

  /**
   * Perform real search on Google, YouTube, GitHub, Wikipedia, etc.
   * Directly navigates to the official search URL in a real browser tab.
   */
  public search(params: {
    engine: string;
    query: string;
  }): {
    success: boolean;
    tabId?: string;
    engineName: string;
    query: string;
    searchUrl: string;
    message: string;
  } {
    const cleanQuery = (params.query || '').trim();
    const target = BrowserSearch.buildSearchUrl(params.engine, cleanQuery);

    // Execute real browser navigation
    const opened = BrowserNavigation.openInExternalTab(target.searchUrl);

    // Record tab in OREO workspace
    const tabTitle = `${target.engineName}: ${cleanQuery}`;
    const tab = this.tabManager.createTab({
      url: target.searchUrl,
      title: tabTitle,
      icon: target.icon,
      query: cleanQuery,
      activate: true,
      lastAction: `Searched "${cleanQuery}"`,
    });

    this.isOpen = true;
    this.isMinimized = false;
    this.notify();

    return {
      success: true,
      tabId: tab.id,
      engineName: target.engineName,
      query: cleanQuery,
      searchUrl: target.searchUrl,
      message: opened
        ? `Searching ${target.engineName} for "${cleanQuery}" in your browser.`
        : `Navigating to ${target.engineName} search for "${cleanQuery}".`,
    };
  }

  /**
   * Directly open a website by URL or domain.
   */
  public openWebsite(url: string, siteName?: string): { success: boolean; url: string; message: string } {
    const res = this.open({ url, appName: siteName });
    return {
      success: res.success,
      url: res.url,
      message: res.message,
    };
  }

  /**
   * Direct website search action.
   */
  public searchWebsite(site: string, query: string): { success: boolean; searchUrl: string; message: string } {
    const res = this.search({ engine: site, query });
    return {
      success: res.success,
      searchUrl: res.searchUrl,
      message: res.message,
    };
  }

  /**
   * Open a new browser tab.
   */
  public openNewBrowserTab(url?: string): { success: boolean; tabId: string; message: string } {
    return this.newTab(url);
  }

  /**
   * Navigate tab to new target URL.
   */
  public navigate(url: string, tabId?: string): { success: boolean; currentUrl: string; message: string } {
    const targetId = tabId || this.tabManager.getActiveTabId();
    const norm = BrowserNavigation.normalizeUrl(url);

    if (!targetId) {
      const openRes = this.open({ url: norm.url });
      return { success: openRes.success, currentUrl: openRes.url, message: openRes.message };
    }

    BrowserNavigation.openInExternalTab(norm.url);
    const navResult = this.tabManager.navigateTab(targetId, norm.url);
    this.notify();

    return {
      success: true,
      currentUrl: norm.url,
      message: `Navigated to ${navResult.tab?.title || norm.url} in your browser.`,
    };
  }

  /**
   * Go back in active tab history.
   */
  public back(): { success: boolean; currentUrl?: string; message: string } {
    const res = this.tabManager.goBack();
    if (res.success && res.currentUrl) {
      BrowserNavigation.openInExternalTab(res.currentUrl);
      this.notify();
      return {
        success: true,
        currentUrl: res.currentUrl,
        message: `Navigated back to ${res.currentUrl} in your browser.`,
      };
    }
    return {
      success: false,
      message: 'No previous page in tab history.',
    };
  }

  /**
   * Go forward in active tab history.
   */
  public forward(): { success: boolean; currentUrl?: string; message: string } {
    const res = this.tabManager.goForward();
    if (res.success && res.currentUrl) {
      BrowserNavigation.openInExternalTab(res.currentUrl);
      this.notify();
      return {
        success: true,
        currentUrl: res.currentUrl,
        message: `Navigated forward to ${res.currentUrl} in your browser.`,
      };
    }
    return {
      success: false,
      message: 'No forward page in tab history.',
    };
  }

  /**
   * Reload active tab.
   */
  public reload(): { success: boolean; message: string } {
    const res = this.tabManager.reload();
    if (res.success && res.currentUrl) {
      BrowserNavigation.openInExternalTab(res.currentUrl);
      this.notify();
      return {
        success: true,
        message: `Reloading ${res.currentUrl} in your browser.`,
      };
    }
    return {
      success: false,
      message: 'No active tab to reload.',
    };
  }

  /**
   * Open a new blank or specific tab in the browser workspace.
   */
  public newTab(url?: string): { success: boolean; tabId: string; message: string } {
    const targetUrl = url || 'https://www.google.com';
    const norm = BrowserNavigation.normalizeUrl(targetUrl);
    const resolved = BrowserRegistry.resolveUrl(norm.url);

    BrowserNavigation.openInExternalTab(resolved.url);

    const tab = this.tabManager.createTab({
      url: resolved.url,
      title: resolved.appName,
      icon: resolved.icon,
      activate: true,
      lastAction: 'Opened Tab',
    });

    this.isOpen = true;
    this.isMinimized = false;
    this.notify();

    return {
      success: true,
      tabId: tab.id,
      message: `Opened new tab for ${resolved.appName} in your browser.`,
    };
  }

  /**
   * Close a specific tab or active tab.
   */
  public closeTab(tabIdOrTitle?: string): { success: boolean; remainingCount: number; message: string } {
    const res = this.tabManager.closeTab(tabIdOrTitle);
    if (res.remainingCount === 0) {
      this.isOpen = false;
    }
    this.notify();
    return {
      success: res.success,
      remainingCount: res.remainingCount,
      message: res.success ? `Closed tab record.` : `No matching tab to close.`,
    };
  }

  /**
   * Switch focus to an existing tab.
   */
  public switchTab(tabIdOrTitle: string): { success: boolean; message: string } {
    const res = this.tabManager.switchTab(tabIdOrTitle);
    if (res.success && res.activeTab) {
      this.isOpen = true;
      this.isMinimized = false;
      this.notify();
      return {
        success: true,
        message: `Switched active workspace focus to ${res.activeTab.title}.`,
      };
    }
    return {
      success: false,
      message: `No open tab found matching "${tabIdOrTitle}".`,
    };
  }

  public toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.notify();
  }

  public toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    this.notify();
  }

  public toggleWorkspace(open?: boolean) {
    this.isOpen = open !== undefined ? open : !this.isOpen;
    if (this.isOpen) {
      this.isMinimized = false;
    }
    this.notify();
  }
}
