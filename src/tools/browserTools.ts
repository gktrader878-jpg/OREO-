import { BrowserController } from '../browser/BrowserController';

export class BrowserTools {
  private static controller: BrowserController = BrowserController.getInstance();

  public static handleBrowserOpen(args?: { url?: string; appName?: string; mode?: 'embedded' | 'new-tab' }): Record<string, any> {
    const rawTarget = (args?.url || args?.appName || '').trim();
    if (!rawTarget) {
      return {
        success: false,
        message: 'Please specify a valid website address, URL, or application name (e.g. YouTube, Google, Wikipedia).',
      };
    }

    const res = this.controller.open({
      url: args?.url,
      appName: args?.appName,
      mode: args?.mode,
    });

    return {
      success: res.success,
      tabId: res.tabId,
      url: res.url,
      title: res.title,
      openedInExternalTab: res.openedInExternalTab,
      message: res.message,
    };
  }

  public static handleBrowserSearch(args?: { engine?: string; query?: string }): Record<string, any> {
    const engine = args?.engine || 'google';
    const query = (args?.query || '').trim();

    if (!query) {
      return {
        success: false,
        message: 'Please provide a search term or question to search for.',
      };
    }

    const res = this.controller.search({
      engine,
      query,
    });

    return {
      success: res.success,
      tabId: res.tabId,
      engine: res.engineName,
      query: res.query,
      searchUrl: res.searchUrl,
      message: res.message,
    };
  }

  public static handleOpenWebsite(args?: { url?: string; siteName?: string }): Record<string, any> {
    const rawUrl = (args?.url || args?.siteName || '').trim();
    if (!rawUrl) {
      return {
        success: false,
        message: 'Please provide a website URL or name to open.',
      };
    }
    const res = this.controller.openWebsite(rawUrl, args?.siteName);
    return {
      success: res.success,
      url: res.url,
      message: res.message,
    };
  }

  public static handleSearchWebsite(args?: { site?: string; query?: string }): Record<string, any> {
    const site = args?.site || 'google';
    const query = (args?.query || '').trim();
    if (!query) {
      return {
        success: false,
        message: 'Please specify search keywords.',
      };
    }
    const res = this.controller.searchWebsite(site, query);
    return {
      success: res.success,
      searchUrl: res.searchUrl,
      message: res.message,
    };
  }

  public static handleOpenNewBrowserTab(args?: { url?: string }): Record<string, any> {
    const res = this.controller.openNewBrowserTab(args?.url);
    return {
      success: res.success,
      tabId: res.tabId,
      message: res.message,
    };
  }

  public static handleBrowserBack(): Record<string, any> {
    const res = this.controller.back();
    return {
      success: res.success,
      currentUrl: res.currentUrl,
      message: res.message,
    };
  }

  public static handleBrowserForward(): Record<string, any> {
    const res = this.controller.forward();
    return {
      success: res.success,
      currentUrl: res.currentUrl,
      message: res.message,
    };
  }

  public static handleBrowserReload(): Record<string, any> {
    const res = this.controller.reload();
    return {
      success: res.success,
      message: res.message,
    };
  }

  public static handleBrowserNewTab(args: { url?: string }): Record<string, any> {
    const res = this.controller.newTab(args?.url);
    return {
      success: res.success,
      tabId: res.tabId,
      message: res.message,
    };
  }

  public static handleBrowserCloseTab(args: { tabIdOrTitle?: string }): Record<string, any> {
    const res = this.controller.closeTab(args?.tabIdOrTitle);
    return {
      success: res.success,
      remainingTabsCount: res.remainingCount,
      message: res.message,
    };
  }

  public static handleBrowserSwitchTab(args?: { tabIdOrTitle?: string }): Record<string, any> {
    const key = (args?.tabIdOrTitle || '').trim();
    if (!key) {
      return {
        success: false,
        message: 'Please specify which tab or website to switch to.',
      };
    }
    const res = this.controller.switchTab(key);
    return {
      success: res.success,
      message: res.message,
    };
  }

  public static handleBrowserScroll(args?: { direction?: string; amount?: number; deltaY?: number; deltaX?: number }): Record<string, any> {
    const dir = (args?.direction || 'down').toLowerCase();
    const amount = args?.amount || (args?.deltaY !== undefined ? Math.abs(args.deltaY) : 400);
    let deltaY = 0;
    let deltaX = args?.deltaX || 0;

    if (dir === 'up' || dir === 'top') {
      deltaY = dir === 'top' ? -10000 : -amount;
    } else if (dir === 'down' || dir === 'bottom') {
      deltaY = dir === 'bottom' ? 10000 : amount;
    } else if (dir === 'left') {
      deltaX = -amount;
    } else if (dir === 'right') {
      deltaX = amount;
    } else if (args?.deltaY !== undefined) {
      deltaY = args.deltaY;
    }

    if (typeof window !== 'undefined') {
      // Find active scrollable container or fallback to window
      const scrollable = document.querySelector('.overflow-y-auto, [data-scrollable], main, .chat-messages, .workspace-content') as HTMLElement | null;
      if (scrollable) {
        scrollable.scrollBy({ top: deltaY, left: deltaX, behavior: 'smooth' });
      } else {
        window.scrollBy({ top: deltaY, left: deltaX, behavior: 'smooth' });
      }
    }

    return {
      success: true,
      direction: dir,
      deltaY,
      deltaX,
      message: `Scrolled active view ${dir} by ${amount}px.`,
    };
  }
}
