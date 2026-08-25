import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code,
  Copy,
  ExternalLink,
  Flame,
  Globe,
  Lock,
  Mail,
  MapPin,
  Maximize2,
  MessageSquare,
  Minimize2,
  Minus,
  Music,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShoppingBag,
  Sparkles,
  Tv,
  X,
  Youtube,
} from 'lucide-react';
import { BrowserController, BrowserWorkspaceState } from '../browser/BrowserController';
import { BrowserRegistry, WebAppInfo } from '../browser/BrowserRegistry';
import { BrowserSearch, SearchEngine } from '../browser/BrowserSearch';

interface BrowserWorkspaceProps {
  browserState: BrowserWorkspaceState;
}

export const BrowserWorkspace: React.FC<BrowserWorkspaceProps> = ({ browserState }) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedEngine, setSelectedEngine] = useState<SearchEngine>('google');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const browserController = BrowserController.getInstance();

  if (!browserState.isOpen) return null;

  const activeTab = browserState.activeTab || browserState.tabs[0];
  const allApps = BrowserRegistry.getAllApps();

  const getIconComponent = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-400" />;
      case 'search':
      case 'google':
      case 'duckduckgo':
        return <Search className="w-4 h-4 text-blue-400" />;
      case 'mail':
      case 'gmail':
        return <Mail className="w-4 h-4 text-red-300" />;
      case 'music':
      case 'spotify':
        return <Music className="w-4 h-4 text-emerald-400" />;
      case 'messagesquare':
      case 'discord':
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case 'code':
      case 'github':
        return <Code className="w-4 h-4 text-zinc-300" />;
      case 'flame':
      case 'reddit':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'mappin':
      case 'maps':
        return <MapPin className="w-4 h-4 text-green-400" />;
      case 'shoppingbag':
      case 'amazon':
        return <ShoppingBag className="w-4 h-4 text-amber-400" />;
      case 'share2':
      case 'twitter':
      case 'linkedin':
        return <Share2 className="w-4 h-4 text-sky-400" />;
      case 'sparkles':
      case 'chatgpt':
        return <Sparkles className="w-4 h-4 text-teal-300" />;
      case 'tv':
      case 'twitch':
        return <Tv className="w-4 h-4 text-purple-400" />;
      default:
        return <Globe className="w-4 h-4 text-cyan-400" />;
    }
  };

  const handleSearchOrNavigate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    if (query.startsWith('http://') || query.startsWith('https://') || (query.includes('.') && !query.includes(' '))) {
      browserController.open({ url: query });
    } else {
      browserController.search({ engine: selectedEngine, query });
    }
    setSearchInput('');
  };

  const handleQuickLaunch = (app: WebAppInfo) => {
    browserController.open({ url: app.url, appName: app.name });
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  };

  // Minimized Bar HUD View
  if (browserState.isMinimized) {
    return (
      <div className="fixed bottom-24 right-6 z-40 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#080c14]/95 border border-cyan-500/30 text-white shadow-[0_0_30px_rgba(6,182,212,0.2)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-xs font-mono font-semibold tracking-wider text-cyan-300 uppercase">
              BROWSER HUB ({browserState.tabs.length} TAB{browserState.tabs.length > 1 ? 'S' : ''})
            </span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {activeTab && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono max-w-[150px] truncate">
              {getIconComponent(activeTab.icon)}
              <span className="truncate">{activeTab.title}</span>
            </div>
          )}

          <button
            onClick={() => browserController.toggleMinimize()}
            className="p-1 rounded-lg hover:bg-white/10 text-cyan-400 hover:text-white transition-colors cursor-pointer"
            title="Restore Browser Command Hub"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => browserController.toggleWorkspace(false)}
            className="p-1 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed z-40 transition-all duration-300 flex flex-col ${
        browserState.isFullscreen
          ? 'inset-2 sm:inset-4'
          : 'bottom-20 right-4 left-4 sm:left-auto sm:right-6 sm:w-[760px] lg:w-[880px] h-[540px] sm:h-[580px]'
      }`}
    >
      <div className="flex flex-col h-full rounded-2xl bg-[#06090f]/95 border border-cyan-500/30 shadow-[0_0_60px_rgba(0,0,0,0.85),0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Top Window Bar */}
        <div className="h-11 px-3 bg-[#0a0f1a]/90 border-b border-white/10 flex items-center justify-between gap-2 select-none">
          {/* Left Title / Branding */}
          <div className="flex items-center gap-2 pl-1 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-300 uppercase">
              OREO BROWSER HUB
            </span>
          </div>

          {/* Tab Strip */}
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[55%]">
            {browserState.tabs.map((tab) => {
              const isActive = tab.id === activeTab?.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => browserController.switchTab(tab.id)}
                  className={`group flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-all border shrink-0 ${
                    isActive
                      ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200 shadow-sm'
                      : 'bg-white/5 border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
                  }`}
                >
                  {getIconComponent(tab.icon)}
                  <span className="max-w-[100px] truncate text-[11px] font-medium">{tab.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      browserController.closeTab(tab.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => browserController.newTab('https://www.google.com')}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-cyan-300 transition-colors shrink-0 cursor-pointer"
              title="Open New Tab"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Window Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => browserController.toggleMinimize()}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => browserController.toggleFullscreen()}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={browserState.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {browserState.isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => browserController.toggleWorkspace(false)}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Command & Address Bar */}
        <div className="p-3 bg-[#080d17] border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* History Nav */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => browserController.back()}
              disabled={!activeTab?.canGoBack}
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-cyan-300 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => browserController.forward()}
              disabled={!activeTab?.canGoForward}
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-cyan-300 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors cursor-pointer"
              title="Forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => browserController.reload()}
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-cyan-300 transition-colors cursor-pointer"
              title="Reload / Launch in Browser"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Engine Selector */}
          <select
            value={selectedEngine}
            onChange={(e) => setSelectedEngine(e.target.value as SearchEngine)}
            className="h-8 px-2 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-cyan-300 outline-none hover:border-cyan-500/40 cursor-pointer"
          >
            <option value="google">Google</option>
            <option value="youtube">YouTube</option>
            <option value="wikipedia">Wikipedia</option>
            <option value="github">GitHub</option>
            <option value="reddit">Reddit</option>
            <option value="spotify">Spotify</option>
            <option value="maps">Maps</option>
            <option value="amazon">Amazon</option>
            <option value="linkedin">LinkedIn</option>
            <option value="duckduckgo">DuckDuckGo</option>
          </select>

          {/* Search / URL input */}
          <form onSubmit={handleSearchOrNavigate} className="flex-1 flex items-center gap-1.5">
            <div className="relative flex-1 flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`Search ${selectedEngine} or enter URL...`}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-black/70 border border-white/15 focus:border-cyan-400 text-xs font-mono text-cyan-100 placeholder:text-zinc-600 outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="h-8 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer shrink-0"
            >
              <span>Launch</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </form>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 no-scrollbar">
          {/* Active Tab Focus Hero */}
          {activeTab && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-zinc-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-inner">
                  {getIconComponent(activeTab.icon)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">{activeTab.title}</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live in Browser Tab
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono mt-0.5">
                    <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate max-w-[320px] sm:max-w-[420px]">{activeTab.url}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => handleCopyUrl(activeTab.url)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-1 border border-white/10 transition-colors cursor-pointer"
                  title="Copy direct URL"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => browserController.open({ url: activeTab.url, appName: activeTab.title })}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-xs font-mono flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
                >
                  <span>Re-Open Tab</span>
                  <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Launchpad Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Instant Launchpad</span>
              </h4>
              <span className="text-[10px] font-mono text-zinc-500">Opens directly in your browser</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {allApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => handleQuickLaunch(app)}
                  className="group p-3 rounded-xl bg-white/[0.03] hover:bg-cyan-950/30 border border-white/10 hover:border-cyan-500/40 text-left transition-all duration-200 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-black/60 border border-white/10 group-hover:border-cyan-500/30 group-hover:scale-105 transition-all shrink-0">
                      {getIconComponent(app.icon)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                        {app.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate capitalize">{app.category}</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-cyan-400 transition-colors shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Recent Browsing & Tab Records */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                Active Session Records ({browserState.tabs.length})
              </h4>
              <span className="text-[10px] font-mono text-cyan-400">Controlled via OREO Tools</span>
            </div>

            <div className="space-y-1.5">
              {browserState.tabs.map((tab) => (
                <div
                  key={tab.id}
                  className="p-2.5 rounded-lg bg-black/40 border border-white/5 hover:border-white/15 flex items-center justify-between gap-3 text-xs font-mono transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getIconComponent(tab.icon)}
                    <span className="font-medium text-zinc-200 truncate">{tab.title}</span>
                    {tab.query && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 shrink-0">
                        Query: {tab.query}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500 truncate hidden sm:inline">{tab.url}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => browserController.open({ url: tab.url, appName: tab.title })}
                      className="p-1 rounded hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Launch in tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => browserController.closeTab(tab.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove record"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Workspace Status Bar */}
        <div className="h-8 px-3 bg-[#05080f] border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-zinc-300 font-semibold tracking-wide">
              REAL BROWSER NAVIGATION • ACTIVE
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-zinc-500">Native Tab Routing (window.open)</span>
            <span className="text-cyan-400 font-mono">
              {browserState.tabs.length} Recorded Tab{browserState.tabs.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
