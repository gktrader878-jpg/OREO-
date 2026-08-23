import React from 'react';
import { Activity, Check, FastForward, Info, Sparkles, Volume2, X, Zap } from 'lucide-react';
import { ResponseSpeedMode, SessionTelemetry, VisualizerMode, VoiceOption } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: VoiceOption;
  onSelectVoice: (voice: VoiceOption) => void;
  visualizerMode: VisualizerMode;
  onSelectVisualizerMode: (mode: VisualizerMode) => void;
  responseSpeedMode: ResponseSpeedMode;
  onSelectSpeedMode: (mode: ResponseSpeedMode) => void;
  telemetry: SessionTelemetry;
}

const VOICES: Array<{ id: VoiceOption; name: string; tag: string; description: string }> = [
  {
    id: 'Puck',
    name: 'Puck (Default)',
    tag: 'Young & Witty Male',
    description: 'Charming, energetic, playful, and sharp. Ideal for OREO’s quick banter and conversational charisma.',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    tag: 'Deep & Authoritative Male',
    description: 'Deep, resonant, and commanding voice profile with cinematic presence.',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    tag: 'Calm & Suave Male',
    description: 'Smooth, relaxed, articulate, and composed tone.',
  },
  {
    id: 'Charon',
    name: 'Charon',
    tag: 'Mature & Poised Male',
    description: 'Crisp, distinguished, and formal voice structure.',
  },
];

const MODES: Array<{ id: VisualizerMode; label: string; desc: string }> = [
  { id: 'orb', label: 'Sleek Core', desc: 'Minimalist reactive halo' },
  { id: 'waveform', label: 'Spectrum Radar', desc: 'Frequency arc bars' },
  { id: 'particles', label: 'Quantum Swarm', desc: 'Floating particle cloud' },
  { id: 'cyberhud', label: 'Cyber HUD', desc: 'Tactical telemetry rings' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
  visualizerMode,
  onSelectVisualizerMode,
  responseSpeedMode,
  onSelectSpeedMode,
  telemetry,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-[#09090b] border border-white/10 p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto"
        id="settings-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <div className="w-4 h-4 border-2 border-white rounded-full" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">OREO SYSTEM CONFIG</h2>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Audio Pipeline & Speed</span>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-settings"
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content sections */}
        <div className="space-y-6 pt-5">
          {/* Section 1: Fast Response & Latency Mode */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
              <FastForward className="w-4 h-4 text-cyan-400" />
              Response Speed Engine
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => onSelectSpeedMode('turbo')}
                id="speed-mode-turbo"
                className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                  responseSpeedMode === 'turbo'
                    ? 'bg-cyan-950/40 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)] text-white'
                    : 'bg-white/5 border-white/10 hover:border-white/20 text-zinc-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm flex items-center gap-1.5 text-cyan-300">
                      <span>⚡ Fast Respond</span>
                    </span>
                    {responseSpeedMode === 'turbo' && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400/90 block mt-0.5">Ultra Low-Latency (Default)</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-mono text-[11px]">
                  ~64ms audio chunking, 320ms turn detection, and instant first-syllable answer delivery without preamble.
                </p>
              </button>

              <button
                onClick={() => onSelectSpeedMode('balanced')}
                id="speed-mode-balanced"
                className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                  responseSpeedMode === 'balanced'
                    ? 'bg-blue-950/40 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)] text-white'
                    : 'bg-white/5 border-white/10 hover:border-white/20 text-zinc-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Balanced Mode</span>
                    {responseSpeedMode === 'balanced' && <Check className="w-4 h-4 text-blue-400" />}
                  </div>
                  <span className="text-[11px] font-mono text-blue-400/90 block mt-0.5">Standard Conversational</span>
                </div>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-mono text-[11px]">
                  Extended 550ms speech pause threshold for relaxed, slower-paced inquiries.
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Voice Persona Selection */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-blue-400" />
              Male Voice Personas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VOICES.map((v) => {
                const isSelected = selectedVoice === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => onSelectVoice(v.id)}
                    id={`voice-option-${v.id}`}
                    className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.2)] text-white'
                        : 'bg-white/5 border-white/10 hover:border-white/20 text-zinc-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{v.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                      </div>
                      <span className="text-[11px] font-mono text-blue-400/90 block mt-0.5">{v.tag}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{v.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Visualizer Theme */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-400" />
              Visualizer Engine
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => {
                const isSelected = visualizerMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelectVisualizerMode(m.id)}
                    id={`visualizer-mode-${m.id}`}
                    className={`p-3 rounded-xl text-left border text-xs font-mono transition-all ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-200 shadow-md'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      {m.label}
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Live Pipeline Diagnostics */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              Live Audio & Intelligence Diagnostics
            </h3>
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Model Engine</span>
                <span className="text-blue-400">gemini-3.1-flash-live-preview</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Response Speed</span>
                <span className="text-cyan-400 font-semibold">
                  {responseSpeedMode === 'turbo' ? '⚡ Fast Respond (320ms Turn Detection)' : 'Balanced (550ms)'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Microphone Capture</span>
                <span className="text-zinc-200">16,000 Hz PCM16 (64ms Low-Latency Chunks)</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Audio Output Engine</span>
                <span className="text-zinc-200">24,000 Hz Web Audio Instant Queue (5ms Jitter Buffer)</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Interruption Mode</span>
                <span className="text-emerald-400">Instant Real-Time Cutoff</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Emotional Resonance</span>
                <span className="text-cyan-400 capitalize">
                  {telemetry.emotion?.current || 'neutral'} ({Math.round((telemetry.emotion?.intensity || 0) * 100)}% intensity)
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Round-Trip Latency</span>
                <span className="text-blue-400">
                  {telemetry.latencyMs > 0 ? `${telemetry.latencyMs} ms` : '<25 ms'}
                </span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="p-3.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-cyan-300/90 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Fast Respond is optimized for immediate answers and low-latency interaction. Speak naturally to ask questions, launch apps, or manage timers.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs tracking-wide transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
