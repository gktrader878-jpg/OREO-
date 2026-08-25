import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  ExternalLink,
  Minus,
  Maximize2,
  Minimize2,
  X,
  Search,
} from 'lucide-react';
import { BrowserTab } from '../browser/BrowserTabManager';

interface BrowserToolbarProps {
  activeTab: BrowserTab | null;
  isFullscreen: boolean;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onOpenExternal: () => void;
  onToggleFullscreen: () => void;
  onToggleMinimize: () => void;
  onCloseWorkspace: () => void;
}

export const BrowserToolbar: React.FC<BrowserToolbarProps> = ({
  activeTab,
  isFullscreen,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onOpenExternal,
  onToggleFullscreen,
  onToggleMinimize,
  onCloseWorkspace,
}) => {
  const [addressInput, setAddressInput] = useState<string>('');

  useEffect(() => {
    if (activeTab) {
      setAddressInput(activeTab.url);
    }
  }, [activeTab?.url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      onNavigate(addressInput.trim());
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#090d16]/95 border-b border-cyan-500/20 backdrop-blur-md select-none">
      {/* Navigation Buttons (Back, Forward, Reload) */}
      <div className="flex items-center gap-1">
        <button
          onClick={onBack}
          disabled={!activeTab?.canGoBack}
          title="Back"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onForward}
          disabled={!activeTab?.canGoForward}
          title="Forward"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onReload}
          title="Reload page"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
        >
          <RotateCw
            className={`w-4 h-4 ${
              activeTab?.status === 'loading' ? 'animate-spin text-cyan-400' : ''
            }`}
          />
        </button>
      </div>

      {/* URL Address Input Bar */}
      <form onSubmit={handleSubmit} className="flex-1 min-w-[200px] relative flex items-center">
        <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none text-zinc-500">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
        </div>

        <input
          type="text"
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          placeholder="Search with Google or enter website URL..."
          className="w-full h-8 pl-8 pr-8 rounded-xl bg-zinc-950/80 border border-cyan-500/25 text-xs font-mono text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 shadow-inner"
        />

        <button
          type="submit"
          title="Navigate"
          className="absolute right-2 p-1 text-zinc-400 hover:text-cyan-300 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* External Browser Tab Launch Button */}
      <button
        onClick={onOpenExternal}
        title="Open current page in a real browser tab"
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-[11px]">Open in Tab</span>
      </button>

      {/* Window Controls (Minimize, Fullscreen, Close) */}
      <div className="flex items-center gap-1 pl-1 border-l border-white/10">
        <button
          onClick={onToggleMinimize}
          title="Minimize workspace"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Restore window size' : 'Fullscreen'}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onCloseWorkspace}
          title="Close workspace"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
