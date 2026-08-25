import { BrowserRegistry } from './BrowserRegistry';

export type SearchEngine =
  | 'google'
  | 'youtube'
  | 'wikipedia'
  | 'github'
  | 'reddit'
  | 'maps'
  | 'spotify'
  | 'duckduckgo'
  | 'twitter'
  | 'amazon'
  | 'linkedin';

export interface SearchResultTarget {
  engine: string;
  engineName: string;
  query: string;
  searchUrl: string;
  canEmbed: boolean;
  icon: string;
}

export class BrowserSearch {
  /**
   * Builds the official real search URL for a given engine and query.
   */
  public static buildSearchUrl(engine: string, query: string): SearchResultTarget {
    const rawEngine = (engine || 'google').toLowerCase().trim();
    const cleanQuery = query.trim();
    const encoded = encodeURIComponent(cleanQuery);

    let resolvedEngine: SearchEngine = 'google';
    if (rawEngine.includes('youtube') || rawEngine.includes('video')) {
      resolvedEngine = 'youtube';
    } else if (rawEngine.includes('wiki')) {
      resolvedEngine = 'wikipedia';
    } else if (rawEngine.includes('github') || rawEngine.includes('code')) {
      resolvedEngine = 'github';
    } else if (rawEngine.includes('reddit')) {
      resolvedEngine = 'reddit';
    } else if (rawEngine.includes('map') || rawEngine.includes('direction') || rawEngine.includes('location')) {
      resolvedEngine = 'maps';
    } else if (rawEngine.includes('spotify') || rawEngine.includes('music') || rawEngine.includes('song')) {
      resolvedEngine = 'spotify';
    } else if (rawEngine.includes('duck')) {
      resolvedEngine = 'duckduckgo';
    } else if (rawEngine.includes('twitter') || rawEngine.includes('x')) {
      resolvedEngine = 'twitter';
    } else if (rawEngine.includes('amazon') || rawEngine.includes('shop') || rawEngine.includes('buy')) {
      resolvedEngine = 'amazon';
    }

    const appInfo = BrowserRegistry.getApp(resolvedEngine);

    let searchUrl = `https://www.google.com/search?q=${encoded}`;
    if (appInfo && appInfo.searchUrlPattern) {
      searchUrl = appInfo.searchUrlPattern.replace('{query}', encoded);
    }

    return {
      engine: resolvedEngine,
      engineName: appInfo ? appInfo.name : 'Google Search',
      query: cleanQuery,
      searchUrl,
      canEmbed: appInfo ? appInfo.canEmbed : false,
      icon: appInfo ? appInfo.icon : 'Search',
    };
  }
}
