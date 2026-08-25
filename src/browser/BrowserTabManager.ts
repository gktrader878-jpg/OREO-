import { BrowserNavigation } from './BrowserNavigation';
import { BrowserRegistry } from './BrowserRegistry';

export type TabStatus = 'open' | 'closed' | 'navigating';

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  displayUrl: string;
  icon: string;
  status: TabStatus;
  query?: string;
  history: string[];
  historyIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
  openedAt: number;
  lastAction?: string;
}

export class BrowserTabManager {
  private tabs: BrowserTab[] = [];
  private activeTabId: string | null = null;

  public getTabs(): BrowserTab[] {
    return [...this.tabs];
  }

  public getActiveTab(): BrowserTab | null {
    if (!this.activeTabId) return this.tabs[0] || null;
    return this.tabs.find((t) => t.id === this.activeTabId) || this.tabs[0] || null;
  }

  public getActiveTabId(): string | null {
    return this.activeTabId;
  }

  /**
   * Create and record a browser tab entry in OREO's workspace session.
   */
  public createTab(params?: {
    url?: string;
    title?: string;
    icon?: string;
    query?: string;
    lastAction?: string;
    activate?: boolean;
  }): BrowserTab {
    const rawUrl = params?.url || 'https://www.google.com';
    const norm = BrowserNavigation.normalizeUrl(rawUrl);
    const resolved = BrowserRegistry.resolveUrl(norm.url, params?.title);

    const tabId = Math.random().toString(36).substring(2, 10);

    const newTab: BrowserTab = {
      id: tabId,
      title: params?.title || resolved.appName,
      url: norm.url,
      displayUrl: norm.url,
      icon: params?.icon || resolved.icon,
      status: 'open',
      query: params?.query,
      history: [norm.url],
      historyIndex: 0,
      canGoBack: false,
      canGoForward: false,
      openedAt: Date.now(),
      lastAction: params?.lastAction || 'Opened',
    };

    this.tabs.push(newTab);
    if (params?.activate !== false) {
      this.activeTabId = tabId;
    }

    return newTab;
  }

  /**
   * Close a specific tab by ID or active tab.
   */
  public closeTab(tabIdOrTitle?: string): { success: boolean; closedTabId?: string; remainingCount: number } {
    if (this.tabs.length === 0) {
      return { success: false, remainingCount: 0 };
    }

    let targetIndex = -1;
    if (!tabIdOrTitle) {
      targetIndex = this.tabs.findIndex((t) => t.id === this.activeTabId);
    } else {
      const q = tabIdOrTitle.toLowerCase().trim();
      targetIndex = this.tabs.findIndex(
        (t) => t.id === tabIdOrTitle || t.title.toLowerCase() === q || t.title.toLowerCase().includes(q)
      );
    }

    if (targetIndex === -1) {
      targetIndex = this.tabs.length - 1;
    }

    const closedTab = this.tabs[targetIndex];
    this.tabs.splice(targetIndex, 1);

    if (this.activeTabId === closedTab.id) {
      if (this.tabs.length > 0) {
        const nextIndex = Math.min(targetIndex, this.tabs.length - 1);
        this.activeTabId = this.tabs[nextIndex].id;
      } else {
        this.activeTabId = null;
      }
    }

    return {
      success: true,
      closedTabId: closedTab.id,
      remainingCount: this.tabs.length,
    };
  }

  /**
   * Switch active tab by ID or partial title match.
   */
  public switchTab(tabIdOrTitle: string): { success: boolean; activeTab?: BrowserTab } {
    const q = tabIdOrTitle.toLowerCase().trim();
    const found = this.tabs.find(
      (t) => t.id === tabIdOrTitle || t.title.toLowerCase() === q || t.title.toLowerCase().includes(q)
    );

    if (!found) {
      return { success: false };
    }

    this.activeTabId = found.id;
    return { success: true, activeTab: found };
  }

  /**
   * Navigate a tab to a new URL and update history stack.
   */
  public navigateTab(tabId: string, targetUrl: string, query?: string): { success: boolean; tab?: BrowserTab } {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return { success: false };

    const norm = BrowserNavigation.normalizeUrl(targetUrl);
    const resolved = BrowserRegistry.resolveUrl(norm.url);

    const updatedHistory = tab.history.slice(0, tab.historyIndex + 1);
    updatedHistory.push(norm.url);

    tab.url = norm.url;
    tab.displayUrl = norm.url;
    tab.title = resolved.appName;
    tab.icon = resolved.icon;
    tab.query = query;
    tab.history = updatedHistory;
    tab.historyIndex = updatedHistory.length - 1;
    tab.canGoBack = tab.historyIndex > 0;
    tab.canGoForward = false;
    tab.status = 'open';
    tab.lastAction = 'Navigated';

    return { success: true, tab };
  }

  /**
   * Perform back navigation in recorded history stack.
   */
  public goBack(tabId?: string): { success: boolean; currentUrl?: string } {
    const targetId = tabId || this.activeTabId;
    const tab = this.tabs.find((t) => t.id === targetId);
    if (!tab || tab.historyIndex <= 0) return { success: false };

    tab.historyIndex -= 1;
    const targetUrl = tab.history[tab.historyIndex];
    const resolved = BrowserRegistry.resolveUrl(targetUrl);

    tab.url = targetUrl;
    tab.displayUrl = targetUrl;
    tab.title = resolved.appName;
    tab.icon = resolved.icon;
    tab.canGoBack = tab.historyIndex > 0;
    tab.canGoForward = tab.historyIndex < tab.history.length - 1;
    tab.lastAction = 'Back';

    return { success: true, currentUrl: targetUrl };
  }

  /**
   * Perform forward navigation in recorded history stack.
   */
  public goForward(tabId?: string): { success: boolean; currentUrl?: string } {
    const targetId = tabId || this.activeTabId;
    const tab = this.tabs.find((t) => t.id === targetId);
    if (!tab || tab.historyIndex >= tab.history.length - 1) return { success: false };

    tab.historyIndex += 1;
    const targetUrl = tab.history[tab.historyIndex];
    const resolved = BrowserRegistry.resolveUrl(targetUrl);

    tab.url = targetUrl;
    tab.displayUrl = targetUrl;
    tab.title = resolved.appName;
    tab.icon = resolved.icon;
    tab.canGoBack = tab.historyIndex > 0;
    tab.canGoForward = tab.historyIndex < tab.history.length - 1;
    tab.lastAction = 'Forward';

    return { success: true, currentUrl: targetUrl };
  }

  /**
   * Reload active or target tab record.
   */
  public reload(tabId?: string): { success: boolean; currentUrl?: string } {
    const targetId = tabId || this.activeTabId;
    const tab = this.tabs.find((t) => t.id === targetId);
    if (!tab) return { success: false };

    tab.lastAction = 'Reloaded';
    return { success: true, currentUrl: tab.url };
  }
}
