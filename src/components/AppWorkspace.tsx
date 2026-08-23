import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Code,
  ExternalLink,
  FileText,
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
  ShieldAlert,
  Sparkles,
  Tv,
  X,
  Youtube,
} from 'lucide-react';
import { WorkspaceState, WorkspaceTab } from '../types';
import { AppController } from '../services/AppController';

interface AppWorkspaceProps {
  workspace: WorkspaceState;
}

export const AppWorkspace: React.FC<AppWorkspaceProps> = ({ workspace }) => {
  const [urlInput, setUrlInput] = useState('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const appController = AppController.getInstance();

  if (!workspace.isOpen) return null;

  const activeTab = workspace.tabs.find((t) => t.id === workspace.activeTabId) || workspace.tabs[0];

  const getAppIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-400" />;
      case 'search':
      case 'google':
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
      case 'vscode':
        return <Code className="w-4 h-4 text-zinc-300" />;
      case 'flame':
      case 'reddit':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'mappin':
      case 'maps':
        return <MapPin className="w-4 h-4 text-green-400" />;
      case 'sparkles':
      case 'chatgpt':
        return <Sparkles className="w-4 h-4 text-teal-300" />;
      case 'share2':
      case 'twitter':
        return <Share2 className="w-4 h-4 text-sky-400" />;
      case 'tv':
      case 'twitch':
        return <Tv className="w-4 h-4 text-purple-400" />;
      case 'filetext':
      case 'notion':
        return <FileText className="w-4 h-4 text-zinc-200" />;
      default:
        return <Globe className="w-4 h-4 text-cyan-400" />;
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    appController.navigateApp(urlInput);
    setIsEditingUrl(false);
  };

  const handleOpenNewTabDirectly = () => {
    if (activeTab) {
      appController.openNewTab(activeTab.url);
    }
  };

  // Minimized Bar HUD View
  if (workspace.isMinimized) {
    return (
      <div className="fixed bottom-24 right-6 z-40 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-950/90 border border-cyan-500/30 text-white shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-xs font-mono font-semibold tracking-wider text-cyan-300 uppercase">
              Workspace ({workspace.tabs.length} App{workspace.tabs.length > 1 ? 's' : ''})
            </span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {activeTab && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-mono max-w-[140px] truncate">
              {getAppIcon(activeTab.iconName)}
              <span className="truncate">{activeTab.appName}</span>
            </div>
          )}

          <button
            onClick={() => appController.toggleMinimize()}
            className="p-1 rounded-lg hover:bg-white/10 text-cyan-400 hover:text-white transition-colors"
            title="Restore Workspace"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => appController.closeWorkspace()}
            className="p-1 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
            title="Close Workspace"
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
        workspace.isFullscreen
          ? 'inset-2 sm:inset-4'
          : 'bottom-20 right-4 left-4 sm:left-auto sm:right-6 sm:w-[720px] lg:w-[840px] h-[520px] sm:h-[560px]'
      }`}
    >
      <div className="flex flex-col h-full rounded-2xl bg-[#08080a]/95 border border-white/15 shadow-[0_0_60px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.12)] backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Top Window Bar */}
        <div className="h-11 px-3 bg-[#0d0d12]/90 border-b border-white/10 flex items-center justify-between gap-2 select-none">
          {/* Left Title / Branding */}
          <div className="flex items-center gap-2 pl-1 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-300 uppercase">
              OREO APP WORKSPACE
            </span>
          </div>

          {/* Tab Strip */}
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[55%]">
            {workspace.tabs.map((tab) => {
              const isActive = tab.id === activeTab?.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => appController.focusApp(tab.id)}
                  className={`group flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-all border shrink-0 ${
                    isActive
                      ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200 shadow-sm'
                      : 'bg-white/5 border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
                  }`}
                >
                  {getAppIcon(tab.iconName)}
                  <span className="max-w-[90px] truncate text-[11px] font-medium">{tab.appName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      appController.closeApp(tab.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => appController.openWebApp({ appName: 'Google' })}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-cyan-300 transition-colors shrink-0"
              title="Open New App / Tab"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Window Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => appController.toggleMinimize()}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => appController.toggleFullscreen()}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title={workspace.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {workspace.isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => appController.closeWorkspace()}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
              title="Close Workspace"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation & Address Bar */}
        <div className="h-10 px-3 bg-[#0a0a0f] border-b border-white/5 flex items-center justify-between gap-2.5">
          {/* Nav buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {}}
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {}}
              className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
              title="Forward"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => appController.reloadApp()}
              className={`p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-cyan-300 transition-colors ${
                activeTab?.isLoading ? 'animate-spin text-cyan-400' : ''
              }`}
              title="Reload App"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Interactive URL Bar */}
          <div className="flex-1 max-w-xl">
            {isEditingUrl ? (
              <form onSubmit={handleUrlSubmit} className="flex items-center">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onBlur={() => setIsEditingUrl(false)}
                  autoFocus
                  placeholder="Enter URL or search..."
                  className="w-full h-7 px-3 rounded-lg bg-black border border-cyan-500/50 text-xs font-mono text-cyan-200 outline-none shadow-inner"
                />
              </form>
            ) : (
              <div
                onClick={() => {
                  setUrlInput(activeTab?.url || '');
                  setIsEditingUrl(true);
                }}
                className="h-7 px-2.5 rounded-lg bg-black/60 border border-white/10 hover:border-white/20 flex items-center justify-between cursor-text transition-colors group"
              >
                <div className="flex items-center gap-1.5 text-zinc-400 overflow-hidden">
                  <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-mono text-zinc-300 truncate">{activeTab?.url}</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-600 group-hover:text-cyan-400 shrink-0 uppercase">
                  Edit
                </span>
              </div>
            )}
          </div>

          {/* External Launch button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleOpenNewTabDirectly}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-zinc-300 hover:text-cyan-300 text-xs font-mono flex items-center gap-1.5 border border-white/10 hover:border-cyan-500/30 transition-all shadow-sm"
              title="Open website in native browser tab"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden sm:inline text-[11px]">Open in Tab</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative flex-1 bg-black/80 flex flex-col items-center justify-center overflow-hidden">
          {activeTab?.isLoading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse z-20" />
          )}

          {activeTab?.isEmbedBlocked ? (
            /* Honest, polished OREO Fallback Panel when X-Frame-Options or CSP blocks iframe */
            <div className="p-6 max-w-md w-full text-center flex flex-col items-center animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <ShieldAlert className="w-7 h-7 text-cyan-400" />
              </div>

              <h3 className="text-base font-medium text-white mb-1.5 tracking-tight flex items-center gap-2">
                <span>{activeTab.appName} Protected</span>
              </h3>

              <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-mono max-w-sm">
                This website restricts embedded framing due to security policies (X-Frame-Options / CSP). You can launch it directly in a dedicated browser tab.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
                <button
                  onClick={handleOpenNewTabDirectly}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open {activeTab.appName} in New Tab</span>
                </button>

                <button
                  onClick={() => appController.closeApp(activeTab.id)}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-mono transition-colors border border-white/10"
                >
                  Close Tab
                </button>
              </div>
            </div>
          ) : (
            <iframe
              key={activeTab?.id + activeTab?.url}
              src={activeTab?.url}
              title={activeTab?.title || 'OREO Workspace App'}
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
              onLoad={() => {
                if (activeTab) {
                  appController.setTabLoaded(activeTab.id, false);
                }
              }}
              onError={() => {
                if (activeTab) {
                  appController.setTabLoaded(activeTab.id, true);
                }
              }}
            />
          )}
        </div>

        {/* Bottom Workspace Status Bar */}
        <div className="h-7 px-3 bg-[#08080c] border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-400 font-semibold tracking-wider">OREO APP WORKSPACE • ACTIVE</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-zinc-500">{activeTab?.appName}</span>
            <span className="text-cyan-400 font-mono">
              {workspace.tabs.length} Tab{workspace.tabs.length > 1 ? 's' : ''} Open
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
