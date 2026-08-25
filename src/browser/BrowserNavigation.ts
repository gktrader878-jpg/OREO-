export interface NavigationHistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

export class BrowserNavigation {
  /**
   * Safely normalizes and validates an arbitrary input into an absolute HTTP(S) URL.
   */
  public static normalizeUrl(input: string): { url: string; isValid: boolean; hostname: string } {
    const raw = (input || '').trim();
    if (!raw) {
      return { url: 'about:blank', isValid: false, hostname: '' };
    }

    // Prepend https if missing protocol
    let target = raw;
    if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('about:')) {
      if (target.includes('.') && !target.includes(' ')) {
        target = `https://${target}`;
      } else {
        target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
      }
    }

    try {
      const parsed = new URL(target);
      return {
        url: target,
        isValid: true,
        hostname: parsed.hostname,
      };
    } catch {
      return {
        url: target,
        isValid: false,
        hostname: '',
      };
    }
  }

  /**
   * Opens a URL directly in a real external browser tab.
   */
  public static openInExternalTab(url: string): boolean {
    const norm = this.normalizeUrl(url);
    if (!norm.isValid) return false;

    try {
      const win = window.open(norm.url, '_blank', 'noopener,noreferrer');
      return !!win;
    } catch (e) {
      console.warn('[BrowserNavigation] Failed to open external browser tab:', e);
      return false;
    }
  }
}
