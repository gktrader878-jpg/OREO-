export interface AppDefinition {
  id: string;
  name: string;
  url: string;
  category: 'media' | 'search' | 'communication' | 'productivity' | 'developer' | 'utility';
  icon: string;
  canEmbed: boolean; // Many major sites like YouTube, Google, Spotify block iframe framing via X-Frame-Options
  isDesktopOnly?: boolean;
  searchUrlTemplate?: string;
  description: string;
}

export class AppRegistry {
  private static apps: Map<string, AppDefinition> = new Map([
    [
      'youtube',
      {
        id: 'youtube',
        name: 'YouTube',
        url: 'https://www.youtube.com',
        category: 'media',
        icon: 'Youtube',
        canEmbed: false, // Blocks framing with X-Frame-Options: SAMEORIGIN
        searchUrlTemplate: 'https://www.youtube.com/results?search_query={q}',
        description: 'Online video sharing and streaming platform',
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
        canEmbed: false,
        searchUrlTemplate: 'https://www.google.com/search?q={q}',
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
      'spotify',
      {
        id: 'spotify',
        name: 'Spotify',
        url: 'https://open.spotify.com',
        category: 'media',
        icon: 'Music',
        canEmbed: false,
        description: 'Digital music, podcast, and audio streaming service',
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
        description: 'Voice, video, and text communication service',
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
        description: 'Developer platform and Git repository hosting',
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
        canEmbed: true, // Wikipedia allows framing on many pages
        searchUrlTemplate: 'https://en.wikipedia.org/wiki/Special:Search?search={q}',
        description: 'Free online encyclopedia',
      },
    ],
    [
      'reddit',
      {
        id: 'reddit',
        name: 'Reddit',
        url: 'https://www.reddit.com',
        category: 'communication',
        icon: 'Flame',
        canEmbed: false,
        description: 'Network of communities and discussions',
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
        description: 'Web mapping and navigation platform',
      },
    ],
    [
      'chatgpt',
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        url: 'https://chatgpt.com',
        category: 'productivity',
        icon: 'Sparkles',
        canEmbed: false,
        description: 'Conversational AI workspace',
      },
    ],
    [
      'twitter',
      {
        id: 'twitter',
        name: 'X (Twitter)',
        url: 'https://x.com',
        category: 'communication',
        icon: 'Share2',
        canEmbed: false,
        description: 'Real-time social news network',
      },
    ],
    [
      'twitch',
      {
        id: 'twitch',
        name: 'Twitch',
        url: 'https://www.twitch.tv',
        category: 'media',
        icon: 'Tv',
        canEmbed: false,
        description: 'Live streaming service for gaming and entertainment',
      },
    ],
    [
      'notion',
      {
        id: 'notion',
        name: 'Notion',
        url: 'https://www.notion.so',
        category: 'productivity',
        icon: 'FileText',
        canEmbed: false,
        description: 'Connected workspace for docs, wikis, and tasks',
      },
    ],
    // Known Desktop-only / Native OS integrations
    [
      'vscode',
      {
        id: 'vscode',
        name: 'Visual Studio Code',
        url: 'https://vscode.dev',
        category: 'developer',
        icon: 'Code',
        canEmbed: false,
        isDesktopOnly: false, // Has web version at vscode.dev
        description: 'Code editor and development environment',
      },
    ],
  ]);

  public static getAllApps(): AppDefinition[] {
    return Array.from(this.apps.values());
  }

  public static getApp(idOrName: string): AppDefinition | undefined {
    const key = idOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (this.apps.has(key)) return this.apps.get(key);

    for (const app of this.apps.values()) {
      if (app.name.toLowerCase().replace(/[^a-z0-9]/g, '') === key) {
        return app;
      }
    }
    return undefined;
  }

  public static registerApp(app: AppDefinition) {
    this.apps.set(app.id.toLowerCase(), app);
  }

  public static resolveUrl(input: string, explicitAppName?: string): { url: string; appName: string; icon: string; canEmbed: boolean } {
    let clean = (input || '').trim();

    // Check if input matches a known app name directly
    if (explicitAppName) {
      const knownApp = this.getApp(explicitAppName);
      if (knownApp) {
        return {
          url: clean.startsWith('http') ? clean : knownApp.url,
          appName: knownApp.name,
          icon: knownApp.icon,
          canEmbed: knownApp.canEmbed,
        };
      }
    }

    const appFromClean = this.getApp(clean);
    if (appFromClean) {
      return {
        url: appFromClean.url,
        appName: appFromClean.name,
        icon: appFromClean.icon,
        canEmbed: appFromClean.canEmbed,
      };
    }

    // Check if input is a valid URL or domain
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      const parsedDomain = clean.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      const matchingApp = this.getApp(parsedDomain.split('.')[0]);
      return {
        url: clean,
        appName: matchingApp?.name || parsedDomain,
        icon: matchingApp?.icon || 'Globe',
        canEmbed: matchingApp?.canEmbed ?? false,
      };
    }

    if (clean.includes('.') && !clean.includes(' ')) {
      const fullUrl = `https://${clean}`;
      const domainName = clean.replace(/^www\./, '').split('/')[0].split('.')[0];
      const matchingApp = this.getApp(domainName);
      return {
        url: fullUrl,
        appName: matchingApp?.name || clean.split('/')[0],
        icon: matchingApp?.icon || 'Globe',
        canEmbed: matchingApp?.canEmbed ?? false,
      };
    }

    // Default to Google search
    return {
      url: `https://www.google.com/search?q=${encodeURIComponent(clean)}`,
      appName: `Search: ${clean}`,
      icon: 'Search',
      canEmbed: false,
    };
  }

  public static isDesktopOnlyApp(name: string): boolean {
    const desktopKeywords = [
      'terminal',
      'cmd',
      'powershell',
      'finder',
      'file explorer',
      'task manager',
      'activity monitor',
      'steam',
      'photoshop desktop',
      'excel desktop',
      'word desktop',
      'native vscode',
    ];
    const clean = name.toLowerCase();
    return desktopKeywords.some((k) => clean.includes(k));
  }
}
