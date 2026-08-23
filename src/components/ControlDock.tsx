import React from 'react';
import { AppWindow, Brain, Mic, MicOff, Power, PowerOff, Sparkles, Sliders } from 'lucide-react';
import { AssistantState } from '../types';

interface ControlDockProps {
  state: AssistantState;
  isMuted: boolean;
  workspaceOpen: boolean;
  memoryCount?: number;
  onToggleConnect: () => void;
  onToggleMute: () => void;
  onToggleWorkspace: () => void;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  state,
  isMuted,
  workspaceOpen,
  memoryCount = 0,
  onToggleConnect,
  onToggleMute,
  onToggleWorkspace,
  onOpenSettings,
  onOpenMemory,
}) => {
  const isConnected = state === 'listening' || state === 'thinking' || state === 'speaking' || state === 'connecting';

  return (
    <div className="relative z-30 w-full max-w-4xl px-4 sm:px-10 pb-6 pt-2 select-none">
      <div className="flex flex-row items-center justify-between w-full gap-3 p-2 sm:p-2.5 rounded-3xl bg-[#030914]/80 border border-cyan-500/20 backdrop-blur-2xl shadow-[0_0_40px_rgba(6,182,212,0.15)]">
        {/* Left Side: Modular Navigation (Memory, Workspace, Settings) */}
        <div className="flex items-center gap-2">
          {/* Memory Core Button */}
          <button
            onClick={onOpenMemory}
            id="btn-open-memory-dock"
            className="px-3 sm:px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all flex items-center gap-2 text-zinc-300 hover:text-white"
            title="Open OREO Long-Term Memory Core"
          >
            <Brain className="w-4 h-4 text-cyan-400" />
            <span className="text-xs sm:text-sm font-medium hidden sm:inline">Memory</span>
            {memoryCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-[10px] font-mono text-cyan-300 font-bold">
                {memoryCount}
              </span>
            )}
          </button>

          {/* App Workspace Button */}
          <button
            onClick={onToggleWorkspace}
            id="btn-toggle-workspace"
            className={`px-3 sm:px-4 py-2.5 rounded-2xl border transition-all flex items-center gap-2 text-xs sm:text-sm font-medium ${
              workspaceOpen
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white'
            }`}
            title="Open / Close OREO Universal Workspace"
          >
            <AppWindow className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Workspace</span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            id="btn-settings-dock"
            className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-1.5 text-zinc-300 hover:text-white"
            title="Voice Persona & Diagnostics Settings"
          >
            <Sliders className="w-4 h-4 text-zinc-400" />
            <span className="text-xs sm:text-sm font-medium hidden md:inline">Settings</span>
          </button>
        </div>

        {/* Right Side: Core Voice Controls (Mute, Connect/Disconnect) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mic Mute Toggle */}
          <button
            onClick={onToggleMute}
            disabled={!isConnected}
            id="btn-toggle-mute"
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border transition-all flex items-center justify-center ${
              !isConnected
                ? 'opacity-40 cursor-not-allowed bg-zinc-900/50 border-white/5 text-zinc-600'
                : isMuted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Connect / Disconnect Power Button */}
          <button
            onClick={onToggleConnect}
            id="btn-session-toggle"
            className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl font-bold tracking-wide transition-all text-xs sm:text-sm flex items-center gap-2 ${
              isConnected
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 border border-cyan-400 text-white hover:brightness-110 shadow-[0_0_25px_rgba(6,182,212,0.4)]'
            }`}
          >
            {isConnected ? (
              <>
                <PowerOff className="w-4 h-4" />
                <span>Disconnect</span>
              </>
            ) : (
              <>
                <Power className="w-4 h-4 animate-pulse" />
                <span>Initialize OREO</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
