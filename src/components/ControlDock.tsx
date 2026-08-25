import React, { useState } from 'react';
import { AppWindow, Brain, Bot, MessageSquare, Mic, MicOff, Power, PowerOff, Send, Sliders, Sparkles } from 'lucide-react';
import { AssistantState } from '../types';
import { AgentStatus } from '../agent/AgentTypes';

interface ControlDockProps {
  state: AssistantState;
  isMuted: boolean;
  workspaceOpen: boolean;
  memoryCount?: number;
  agentStatus?: AgentStatus;
  onToggleConnect: () => void;
  onToggleMute: () => void;
  onToggleWorkspace: () => void;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
  onOpenAgent?: () => void;
  onSendTextMessage?: (text: string) => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  state,
  isMuted,
  workspaceOpen,
  memoryCount = 0,
  agentStatus = 'idle',
  onToggleConnect,
  onToggleMute,
  onToggleWorkspace,
  onOpenSettings,
  onOpenMemory,
  onOpenAgent,
  onSendTextMessage,
}) => {
  const isConnected = state === 'listening' || state === 'thinking' || state === 'speaking' || state === 'connecting';
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');

  const handleSubmitText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) return;
    if (onSendTextMessage) {
      onSendTextMessage(textInput.trim());
      setTextInput('');
    }
  };

  return (
    <div className="relative z-30 w-full max-w-4xl px-4 sm:px-10 pb-6 pt-2 select-none flex flex-col items-center gap-2">
      {/* Optional Quick Text Command Input Field */}
      {showTextInput && (
        <form
          onSubmit={handleSubmitText}
          className="w-full flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-[#050e1f]/90 border border-cyan-500/30 backdrop-blur-xl shadow-xl animate-in fade-in slide-in-from-bottom-2"
        >
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 ml-1" />
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a voice command or question for OREO (e.g., 'Open YouTube', 'What time is it?')..."
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none px-2 py-1.5"
            autoFocus
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="p-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-white transition-all shadow-md"
            title="Send command to OREO"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      <div className="flex flex-row items-center justify-between w-full gap-3 p-2 sm:p-2.5 rounded-3xl bg-[#030914]/80 border border-cyan-500/20 backdrop-blur-2xl shadow-[0_0_40px_rgba(6,182,212,0.15)]">
        {/* Left Side: Modular Navigation (Agent, Memory, Workspace, Settings, Text Prompt) */}
        <div className="flex items-center gap-2">
          {/* Agent Engine Button */}
          {onOpenAgent && (
            <button
              onClick={onOpenAgent}
              id="btn-open-agent-dock"
              className={`px-3 sm:px-4 py-2.5 rounded-2xl border transition-all flex items-center gap-2 text-xs sm:text-sm font-medium ${
                agentStatus === 'executing' || agentStatus === 'planning' || agentStatus === 'verifying'
                  ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : agentStatus === 'waiting_confirmation'
                  ? 'bg-amber-950/60 border-amber-400 text-amber-300 animate-pulse'
                  : 'bg-white/5 border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-zinc-300 hover:text-white'
              }`}
              title="Open OREO Autonomous Agent Engine"
            >
              <Bot className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline font-mono font-bold">Agent</span>
              {agentStatus !== 'idle' && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              )}
            </button>
          )}

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

          {/* Text Command Toggle */}
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            id="btn-toggle-text-dock"
            className={`p-2.5 sm:px-3 sm:py-2.5 rounded-2xl border transition-all flex items-center gap-1.5 text-xs sm:text-sm font-medium ${
              showTextInput
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white'
            }`}
            title="Toggle Text Input Command"
          >
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">Type</span>
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
