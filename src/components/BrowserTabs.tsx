import React from 'react';
import { Plus, X, Globe, Youtube, Search, Mail, Code, MessageSquare, Flame, Music, MapPin, Share2, ShoppingBag } from 'lucide-react';
import { BrowserTab } from '../browser/BrowserTabManager';

interface BrowserTabsProps {
  tabs: BrowserTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
}

const getTabIcon = (iconName?: string) => {
  switch (iconName?.toLowerCase()) {
    case 'youtube':
      return <Youtube className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    case 'search':
      return <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    case 'mail':
      return <Mail className="w-3.5 h-3.5 text-red-300 shrink-0" />;
    case 'code':
      return <Code className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    case 'messagesquare':
      return <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    case 'flame':
      return <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
    case 'music':
      return <Music className="w-3.5 h-3.5 text-green-400 shrink-0" />;
    case 'mappin':
      return <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    case 'share2':
      return <Share2 className="w-3.5 h-3.5 text-zinc-300 shrink-0" />;
    case 'shoppingbag':
      return <ShoppingBag className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case 'globe':
    default:
      return <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
  }
};

export const BrowserTabs: React.FC<BrowserTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#05080e]/95 border-b border-cyan-500/20 overflow-x-auto select-none no-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`group relative flex items-center gap-2 max-w-[200px] min-w-[120px] h-8 px-3 rounded-t-xl text-xs transition-all cursor-pointer border-t border-x ${
              isActive
                ? 'bg-zinc-900/95 border-cyan-500/40 text-cyan-300 shadow-[0_-2px_10px_rgba(6,182,212,0.15)] font-medium'
                : 'bg-zinc-950/40 border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
            }`}
          >
            {/* Active Top Accent Line */}
            {isActive && (
              <span className="absolute top-0 left-2 right-2 h-[2px] bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />
            )}

            {/* Icon / Loading spinner */}
            {tab.status === 'loading' ? (
              <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              getTabIcon(tab.icon)
            )}

            {/* Tab Title */}
            <span className="truncate flex-1 font-mono tracking-tight text-[11px]">
              {tab.title}
            </span>

            {/* Close Tab Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              title="Close tab"
              className="opacity-0 group-hover:opacity-100 hover:bg-white/10 p-0.5 rounded text-zinc-400 hover:text-red-400 transition-all shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {/* New Tab Button */}
      <button
        onClick={onNewTab}
        title="Open new tab"
        className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-cyan-300 hover:bg-white/5 transition-colors shrink-0"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
