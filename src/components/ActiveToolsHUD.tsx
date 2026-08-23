import React from 'react';
import { Clock, ExternalLink, Globe, Terminal, X } from 'lucide-react';
import { ActiveTimer, OpenedWebsite, ToolActionLog } from '../types';

interface ActiveToolsHUDProps {
  timers: ActiveTimer[];
  openedWebsites: OpenedWebsite[];
  toolLogs: ToolActionLog[];
  onCancelTimer: (id: string) => void;
}

export const ActiveToolsHUD: React.FC<ActiveToolsHUDProps> = ({
  timers,
  openedWebsites,
  toolLogs,
  onCancelTimer,
}) => {
  if (timers.length === 0 && openedWebsites.length === 0 && toolLogs.length === 0) {
    return null;
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-2xl px-4 flex flex-col gap-2.5 z-20 pointer-events-auto">
      {/* Active Live Countdown Timers */}
      {timers.length > 0 && (
        <div className="flex flex-wrap gap-2.5 items-center justify-center">
          {timers.map((timer) => {
            const progress = timer.totalSeconds > 0 ? (timer.remainingSeconds / timer.totalSeconds) * 100 : 0;
            return (
              <div
                key={timer.id}
                id={`active-timer-${timer.id}`}
                className="relative overflow-hidden flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {/* Progress bar background */}
                <div
                  className="absolute left-0 bottom-0 top-0 bg-blue-500/10 pointer-events-none transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />

                <Clock className="w-4 h-4 text-blue-400 animate-pulse relative z-10" />

                <div className="relative z-10 flex flex-col">
                  <span className="text-xs font-medium text-zinc-300">{timer.label}</span>
                  <span className="text-sm font-mono font-bold text-blue-400">
                    {timer.remainingSeconds > 0 ? formatTimer(timer.remainingSeconds) : 'RINGING!'}
                  </span>
                </div>

                <button
                  onClick={() => onCancelTimer(timer.id)}
                  id={`btn-cancel-timer-${timer.id}`}
                  className="relative z-10 p-1 rounded-full text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors ml-1.5"
                  title="Dismiss timer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Opened Websites / Action Cards */}
      {openedWebsites.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center justify-center">
          {openedWebsites.slice(0, 3).map((site) => (
            <button
              key={site.id}
              onClick={() => {
                import('../services/AppController').then(({ AppController }) => {
                  AppController.getInstance().openWebApp({ url: site.url, appName: site.title });
                });
              }}
              id={`hud-website-link-${site.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-xs font-mono text-zinc-300 hover:text-cyan-200 transition-all shadow-md group cursor-pointer"
              title={`View ${site.title} in OREO App Workspace`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
              <span className="max-w-[160px] truncate">{site.title}</span>
              <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-cyan-400" />
            </button>
          ))}
        </div>
      )}

      {/* Recent Tool Execution Badge */}
      {toolLogs.length > 0 && (
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-zinc-400">
            <Terminal className="w-3 h-3 text-blue-400" />
            <span>Action: {toolLogs[0].toolName}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400">Verified</span>
          </div>
        </div>
      )}
    </div>
  );
};
