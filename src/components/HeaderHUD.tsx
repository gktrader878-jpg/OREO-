import React from 'react';
import { Brain, Settings, Sliders, Radio, Activity, Zap, Bot } from 'lucide-react';
import { AssistantState, SessionTelemetry } from '../types';
import { AgentStatus } from '../agent/AgentTypes';

interface HeaderHUDProps {
  state: AssistantState;
  telemetry: SessionTelemetry;
  memoryCount?: number;
  agentStatus?: AgentStatus;
  onOpenSettings: () => void;
  onOpenMemory?: () => void;
  onOpenAgent?: () => void;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  state,
  telemetry,
  memoryCount = 0,
  agentStatus = 'idle',
  onOpenSettings,
  onOpenMemory,
  onOpenAgent,
}) => {
  const getStatusLabel = () => {
    switch (state) {
      case 'speaking':
        return 'Transmitting Voice';
      case 'thinking':
        return 'Processing Matrix';
      case 'listening':
        return 'Listening Online';
      case 'connecting':
        return 'Booting Hologram';
      case 'error':
        return 'Link Error';
      default:
        return 'Standby Mode';
    }
  };

  const getStatusStyle = () => {
    switch (state) {
      case 'speaking':
        return 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]';
      case 'thinking':
        return 'bg-purple-500/15 border-purple-400 text-purple-300 animate-pulse shadow-[0_0_15px_rgba(168,85,247,0.3)]';
      case 'listening':
        return 'bg-emerald-500/15 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)]';
      case 'connecting':
        return 'bg-amber-500/15 border-amber-400 text-amber-300 animate-pulse';
      case 'error':
        return 'bg-rose-500/15 border-rose-400 text-rose-300';
      default:
        return 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400';
    }
  };

  const emotion = telemetry.emotion;

  return (
    <nav className="h-18 px-5 sm:px-10 flex items-center justify-between z-20 border-b border-cyan-500/15 bg-[#02050e]/75 backdrop-blur-xl">
      {/* Brand Identity & Holographic Status */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-300/40">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-wider text-white font-mono">
              OREO
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-semibold px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/20">
              AI AVATAR
            </span>
          </div>
        </div>

        <span
          className={`ml-2 px-2.5 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-widest transition-all ${getStatusStyle()}`}
        >
          {getStatusLabel()}
        </span>
      </div>

      {/* Sci-Fi HUD Telemetry & Actions */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Latency Metric */}
        <div className="flex flex-col items-end hidden sm:flex">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Link Latency</span>
          <span className="text-xs font-mono text-cyan-300 font-bold">
            {state !== 'disconnected' && telemetry.latencyMs > 0 ? `${telemetry.latencyMs}ms` : '18ms'}
          </span>
        </div>

        {/* Voice Persona */}
        <div className="flex flex-col items-end hidden md:flex">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Voice Model</span>
          <span className="text-xs font-mono text-zinc-200 font-semibold">{telemetry.currentVoice}</span>
        </div>

        {/* Speed Mode Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wider uppercase">
            {telemetry.responseSpeedMode === 'balanced' ? 'Balanced' : 'Turbo Low-Latency'}
          </span>
        </div>

        {/* Agent Panel Trigger */}
        {onOpenAgent && (
          <button
            onClick={onOpenAgent}
            id="btn-header-agent"
            title="Open OREO Autonomous Agent Engine"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-mono font-bold ${
              agentStatus === 'executing' || agentStatus === 'planning' || agentStatus === 'verifying'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : agentStatus === 'waiting_confirmation'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                : 'bg-white/5 border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-zinc-300 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">AGENT</span>
            {agentStatus !== 'idle' && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            )}
          </button>
        )}

        {/* Quick Memory Core Button */}
        {onOpenMemory && (
          <button
            onClick={onOpenMemory}
            id="btn-header-memory"
            title="Open OREO Intelligent Memory Core"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-zinc-300 hover:text-white transition-all text-xs"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-medium">Memory</span>
            {memoryCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-[10px] font-mono text-cyan-300 font-bold">
                {memoryCount}
              </span>
            )}
          </button>
        )}

        {/* Settings Action Button */}
        <button
          onClick={onOpenSettings}
          id="btn-open-settings"
          title="Open OREO System Settings"
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-cyan-500/10 hover:border-cyan-500/30 cursor-pointer transition-all text-zinc-400 hover:text-white"
        >
          <Sliders className="w-4 h-4 text-cyan-400" />
        </button>
      </div>
    </nav>
  );
};
