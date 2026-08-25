export interface WebAppInfo {
  id: string;
  name: string;
  url: string;
  category: 'media' | 'search' | 'communication' | 'productivity' | 'developer' | 'utility' | 'social';
  icon: string;
  canEmbed: boolean; // Many major sites like YouTube, Google, Spotify, GitHub block iframe framing via X-Frame-Options / CSP
  searchUrlPattern?: string;
  description: string;
}

export class BrowserRegistry {
  private static apps: Map<string, WebAppInfo> = new Map([
    [
      'youtube',
      {
        id: 'youtube',
        name: 'YouTube',
        url: 'https://www.youtube.com',
        category: 'media',
        icon: 'Youtube',
        canEmbed: false, // X-Frame-Options: SAMEORIGIN
        searchUrlPattern: 'https://www.youtube.com/results?search_query={query}',
        description: 'Online video platform and search',
      },
    ],
    [
      'google',
      {
        id: 'google',
        name: 'Google',
        url: 'https://www.google.com',
        category: 'search',
        icon: 'Search',
        canEmbed: false, // X-Frame-Options: SAMEORIGIN
        searchUrlPattern: 'https://www.google.com/search?q={query}',
        description: 'Web search engine and portal',
      },
    ],
    [
      'gmail',
      {
        id: 'gmail',
        name: 'Gmail',
        url: 'https://mail.google.com',
        category: 'communication',
        icon: 'Mail',
        canEmbed: false,
        description: 'Google email service',
      },
    ],
    [
      'wikipedia',
      {
        id: 'wikipedia',
        name: 'Wikipedia',
        url: 'https://www.wikipedia.org',
        category: 'productivity',
        icon: 'Globe',
        canEmbed: true, // Wikipedia allows framing on many subpages or special embeds
        searchUrlPattern: 'https://en.wikipedia.org/wiki/Special:Search?search={query}',
        description: 'Free online encyclopedia',
      },
    ],
    [
      'github',
      {
        id: 'github',
        name: 'GitHub',
        url: 'https://github.com',
        category: 'developer',
        icon: 'Code',
        canEmbed: false,
        searchUrlPattern: 'https://github.com/search?q={query}',
        description: 'Code repository hosting and developer platform',
      },
    ],
    [
      'reddit',
      {
        id: 'reddit',
        name: 'Reddit',
        url: 'https://www.reddit.com',
        category: 'social',
        icon: 'Flame',
        canEmbed: false,
        searchUrlPattern: 'https://www.reddit.com/search/?q={query}',
        description: 'Communities, discussions, and forums',
      },
    ],
    [
      'spotify',
      {
        id: 'spotify',
        name: 'Spotify',
        url: 'https://open.spotify.com',
        category: 'media',
        icon: 'Music',
        canEmbed: false,
        searchUrlPattern: 'https://open.spotify.com/search/{query}',
        description: 'Music and podcast streaming service',
      },
    ],
    [
      'discord',
      {
        id: 'discord',
        name: 'Discord',
        url: 'https://discord.com/app',
        category: 'communication',
        icon: 'MessageSquare',
        canEmbed: false,
        description: 'Chat and community platform',
      },
    ],
    [
      'maps',
      {
        id: 'maps',
        name: 'Google Maps',
        url: 'https://maps.google.com',
        category: 'utility',
        icon: 'MapPin',
        canEmbed: false,
        searchUrlPattern: 'https://maps.google.com/maps?q={query}',
        description: 'Mapping, satellite view, and navigation',
      },
    ],
    [
      'duckduckgo',
      {
        id: 'duckduckgo',
        name: 'DuckDuckGo',
        url: 'https://duckduckgo.com',
        category: 'search',
        icon: 'Search',
        canEmbed: false,
        searchUrlPattern: 'https://duckduckgo.com/?q={query}',
        description: 'Privacy-focused search engine',
      },
    ],
    [
      'twitter',
      {
        id: 'twitter',
        name: 'X (Twitter)',
        url: 'https://x.com',
        category: 'social',
        icon: 'Share2',
        canEmbed: false,
        searchUrlPattern: 'https://x.com/search?q={query}',
        description: 'Real-time social news network',
      },
    ],
    [
      'amazon',
      {
        id: 'amazon',
        name: 'Amazon',
        url: 'https://www.amazon.com',
        category: 'utility',
        icon: 'ShoppingBag',
        canEmbed: false,
        searchUrlPattern: 'https://www.amazon.com/s?k={query}',
        description: 'Online store and shopping',
      },
    ],
    [
      'linkedin',
      {
        id: 'linkedin',
        name: 'LinkedIn',
        url: 'https://www.linkedin.com',
        category: 'social',
        icon: 'Share2',
        canEmbed: false,
        searchUrlPattern: 'https://www.linkedin.com/search/results/all/?keywords={query}',
        description: 'Professional networking and job search',
      },
    ],
  ]);

  public static getApp(key: string): WebAppInfo | undefined {
    const norm = key.toLowerCase().trim();
    return this.apps.get(norm);
  }

  public static getAllApps(): WebAppInfo[] {
    return Array.from(this.apps.values());
  }

  /**
   * Resolves a natural query or app name into an official URL and embeddability check
   */
  public static resolveUrl(input: string, fallbackAppName?: string): {
    appName: string;
    url: string;
    canEmbed: boolean;
    icon: string;
  } {
    const raw = (input || fallbackAppName || '').trim();
    if (!raw) {
      return {
        appName: 'New Tab',
        url: 'https://www.google.com',
        canEmbed: false,
        icon: 'Globe',
      };
    }

    const lower = raw.toLowerCase();

    // Check if directly matching registered app
    for (const [key, app] of this.apps.entries()) {
      if (
        lower === key ||
        lower === app.name.toLowerCase() ||
        lower.includes(key) ||
        lower.includes(app.name.toLowerCase())
      ) {
        return {
          appName: app.name,
          url: app.url,
          canEmbed: app.canEmbed,
          icon: app.icon,
        };
      }
    }

    // Check if valid URL format
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      try {
        const parsed = new URL(raw);
        const hostName = parsed.hostname.replace(/^www\./, '');
        const baseName = hostName.split('.')[0];
        const capitalized = baseName.charAt(0).toUpperCase() + baseName.slice(1);
        return {
          appName: capitalized || hostName,
          url: raw,
          canEmbed: this.isKnownEmbeddable(parsed.hostname),
          icon: 'Globe',
        };
      } catch {
        // Continue to fallback
      }
    }

    // If domain-like (e.g. "wikipedia.org" or "github.com")
    if (raw.includes('.') && !raw.includes(' ')) {
      const fullUrl = `https://${raw}`;
      try {
        const parsed = new URL(fullUrl);
        const hostName = parsed.hostname.replace(/^www\./, '');
        return {
          appName: hostName,
          url: fullUrl,
          canEmbed: this.isKnownEmbeddable(parsed.hostname),
          icon: 'Globe',
        };
      } catch {
        // Continue to fallback
      }
    }

    // Default to Google search if arbitrary terms
    return {
      appName: `Search: ${raw}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(raw)}`,
      canEmbed: false,
      icon: 'Search',
    };
  }

  public static isKnownEmbeddable(hostname: string): boolean {
    const norm = hostname.toLowerCase();
    // Known embeddable documentation, sandboxes, tools, or wikipedia pages
    const embeddableDomains = [
      'wikipedia.org',
      'wikimedia.org',
      'archive.org',
      'example.com',
      'codepen.io',
      'stackblitz.com',
      'codesandbox.io',
      'github.io',
      'w3schools.com',
      'developer.mozilla.org',
      'openstreetmap.org',
    ];
    return embeddableDomains.some((d) => norm.includes(d));
  }
}
