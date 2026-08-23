import React, { useEffect, useRef } from 'react';
import { Brain, Cpu, Mic, Power, Sparkles, Heart, Zap, Compass, Smile, ShieldAlert } from 'lucide-react';
import { AssistantState, EmotionState, VisualizerMode } from '../types';
import { AudioPlayer } from '../services/AudioPlayer';
import { AudioStreamer } from '../services/AudioStreamer';

interface VisualizerOrbProps {
  state: AssistantState;
  audioStreamer: AudioStreamer;
  audioPlayer: AudioPlayer;
  mode: VisualizerMode;
  userVolume: number;
  assistantVolume: number;
  emotion?: EmotionState;
  onOrbClick: () => void;
}

export const VisualizerOrb: React.FC<VisualizerOrbProps> = ({
  state,
  audioStreamer,
  audioPlayer,
  mode,
  userVolume,
  assistantVolume,
  emotion = { current: 'neutral', intensity: 0, updatedAt: Date.now() },
  onOrbClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const userVolRef = useRef(userVolume);
  const asstVolRef = useRef(assistantVolume);
  const modeRef = useRef(mode);
  const emotionRef = useRef(emotion);

  useEffect(() => {
    stateRef.current = state;
    userVolRef.current = userVolume;
    asstVolRef.current = assistantVolume;
    modeRef.current = mode;
    emotionRef.current = emotion;
  }, [state, userVolume, assistantVolume, mode, emotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const size = 320;
    canvas.width = size;
    canvas.height = size;

    const freqArray = new Uint8Array(64);
    let rotation = 0;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      const centerX = size / 2;
      const centerY = size / 2;
      const currentState = stateRef.current;
      const currentEmotion = emotionRef.current;
      const intensity = currentEmotion.intensity || 0;

      if (currentState === 'speaking') {
        audioPlayer.getByteFrequencyData(freqArray);
      } else if (currentState === 'listening') {
        audioStreamer.getByteFrequencyData(freqArray);
      } else {
        freqArray.fill(0);
      }

      let activeVolume = 0;
      if (currentState === 'speaking') {
        activeVolume = asstVolRef.current;
      } else if (currentState === 'listening') {
        activeVolume = userVolRef.current;
      } else if (currentState === 'thinking') {
        activeVolume = 0.25 + 0.15 * Math.sin(phase * 1.5);
      }

      // Emotional pacing modulation
      let speedMult = 1.0;
      if (currentEmotion.current === 'excited') speedMult = 1.6;
      else if (currentEmotion.current === 'calm') speedMult = 0.7;
      else if (currentEmotion.current === 'serious') speedMult = 0.8;
      else if (currentEmotion.current === 'curious') speedMult = 1.2;

      rotation += (currentState === 'thinking' ? 0.035 : 0.015) * speedMult;
      phase += 0.04 * speedMult;

      const baseRadius = 85;
      const dynamicRadius = baseRadius + activeVolume * 25 + (currentEmotion.current === 'excited' ? intensity * 8 : 0);

      // Draw subtle reactive rings on canvas
      const points = currentEmotion.current === 'curious' ? 56 : 48;
      const layers = currentState === 'speaking' ? 3 : currentState === 'thinking' ? 3 : currentState === 'listening' ? 2 : 1;

      for (let l = 0; l < layers; l++) {
        ctx.beginPath();
        const layerRadius = dynamicRadius * (0.9 + l * 0.12);
        const layerOffset = (l * Math.PI) / layers;

        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const freqIndex = Math.floor((i / points) * (freqArray.length / 2));
          const freqValue = freqArray[freqIndex] || 0;
          
          let freqNorm = 0;
          if (currentState === 'thinking') {
            freqNorm = Math.sin(angle * 6 + phase + l) * 4;
          } else {
            const extraResonance = currentEmotion.current === 'excited' ? 1.3 : 1.0;
            freqNorm = ((freqValue / 255) * (activeVolume * 20 + 8)) * extraResonance;
          }

          const r =
            layerRadius +
            freqNorm * Math.sin(angle * 4 + phase + layerOffset) +
            Math.sin(angle * 6 + rotation * 2) * 2;

          const x = centerX + Math.cos(angle + rotation * (l % 2 === 0 ? 1 : -1)) * r;
          const y = centerY + Math.sin(angle + rotation * (l % 2 === 0 ? 1 : -1)) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        // Emotion-aware canvas stroke rendering
        if (currentState === 'speaking') {
          if (currentEmotion.current === 'excited') {
            ctx.strokeStyle = `rgba(236, 72, 153, ${0.45 - l * 0.1})`;
          } else if (currentEmotion.current === 'empathetic' || currentEmotion.current === 'concerned') {
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.45 - l * 0.1})`;
          } else {
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 - l * 0.1})`;
          }
          ctx.lineWidth = 1.5;
        } else if (currentState === 'thinking') {
          ctx.strokeStyle = `rgba(99, 102, 241, ${0.45 - l * 0.1})`;
          ctx.lineWidth = 1.5;
        } else if (currentState === 'listening') {
          if (currentEmotion.current === 'excited') {
            ctx.strokeStyle = `rgba(14, 165, 233, ${0.55 - l * 0.12})`;
          } else if (currentEmotion.current === 'curious') {
            ctx.strokeStyle = `rgba(6, 182, 212, ${0.55 - l * 0.12})`;
          } else {
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.5 - l * 0.12})`;
          }
          ctx.lineWidth = 1.5;
        } else if (currentState === 'connecting') {
          ctx.strokeStyle = `rgba(245, 158, 11, ${0.35 - l * 0.1})`;
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [audioPlayer, audioStreamer]);

  const getMainTitle = () => {
    switch (state) {
      case 'speaking':
        return 'OREO is Speaking';
      case 'thinking':
        return 'OREO is Thinking...';
      case 'listening':
        return 'OREO is Listening';
      case 'connecting':
        return 'Establishing Stream...';
      case 'error':
        return 'Connection Disrupted';
      default:
        return 'OREO Ready';
    }
  };

  const getSubSubtitle = () => {
    switch (state) {
      case 'speaking':
        return "OREO is generating real-time response audio";
      case 'thinking':
        return "Synthesizing conversational context & natural turn-taking";
      case 'listening':
        return "Speak naturally — OREO respects pauses & silence";
      case 'connecting':
        return "Negotiating ultra-low latency audio pipeline";
      case 'error':
        return "Tap to restart session";
      default:
        return "Tap the core orb to start conversation";
    }
  };

  const getEmotionBadge = () => {
    if (!emotion || emotion.current === 'neutral' || emotion.intensity <= 0.2) return null;

    const label = emotion.current.charAt(0).toUpperCase() + emotion.current.slice(1);
    let color = 'text-blue-400 bg-blue-500/10 border-blue-500/20';

    if (emotion.current === 'excited' || emotion.current === 'happy') {
      color = 'text-pink-400 bg-pink-500/10 border-pink-500/20';
    } else if (emotion.current === 'curious' || emotion.current === 'thoughtful') {
      color = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    } else if (emotion.current === 'calm' || emotion.current === 'empathetic') {
      color = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    } else if (emotion.current === 'serious' || emotion.current === 'confident') {
      color = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    } else if (emotion.current === 'concerned') {
      color = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono border transition-all duration-300 ${color}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        {label} ({Math.round(emotion.intensity * 100)}%)
      </span>
    );
  };

  const isConnected = state === 'listening' || state === 'thinking' || state === 'speaking' || state === 'connecting';

  return (
    <div className="relative flex flex-col items-center justify-center my-auto select-none">
      {/* Sleek Interface Central Circle Container */}
      <div
        className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center cursor-pointer"
        onClick={onOrbClick}
        id="oreo-sleek-core"
        role="button"
        tabIndex={0}
        title={isConnected ? 'End voice conversation' : 'Start voice conversation'}
      >
        {/* Pulsing ambient outer halo rings from Sleek Interface theme */}
        <div
          className={`absolute inset-0 rounded-full border scale-125 transition-all duration-700 pointer-events-none ${
            state === 'speaking'
              ? emotion.current === 'excited'
                ? 'bg-pink-600/10 border-pink-500/30 animate-pulse'
                : 'bg-purple-600/10 border-purple-500/30 animate-pulse'
              : state === 'thinking'
              ? 'bg-indigo-600/15 border-indigo-500/30 scale-125 animate-pulse'
              : state === 'listening'
              ? emotion.current === 'curious'
                ? 'bg-cyan-600/10 border-cyan-500/25 scale-125 animate-pulse'
                : emotion.current === 'calm'
                ? 'bg-blue-600/5 border-blue-500/15 scale-120'
                : 'bg-blue-600/10 border-blue-500/20 scale-125 animate-pulse'
              : state === 'connecting'
              ? 'bg-amber-600/10 border-amber-500/20 scale-125 animate-pulse'
              : 'bg-white/5 border-white/5 scale-110'
          }`}
        />
        <div
          className={`absolute inset-0 rounded-full border scale-150 opacity-40 transition-all duration-700 pointer-events-none ${
            state === 'speaking'
              ? 'bg-purple-600/5 border-purple-500/15'
              : state === 'thinking'
              ? 'bg-indigo-600/10 border-indigo-500/20'
              : state === 'listening'
              ? 'bg-blue-600/5 border-blue-500/10'
              : 'bg-white/5 border-white/5 opacity-20'
          }`}
        />

        {/* Real-time frequency ring overlay canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

        {/* Sleek Spherical Core container */}
        <div
          className={`w-60 h-60 sm:w-64 sm:h-64 rounded-full bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] border border-white/10 flex items-center justify-center relative overflow-hidden group transition-all duration-500 ${
            state === 'speaking'
              ? emotion.current === 'excited'
                ? 'shadow-[0_0_80px_rgba(236,72,153,0.4)] border-pink-500/30'
                : 'shadow-[0_0_80px_rgba(168,85,247,0.35)] border-purple-500/30'
              : state === 'thinking'
              ? 'shadow-[0_0_80px_rgba(99,102,241,0.35)] border-indigo-500/30'
              : state === 'listening'
              ? emotion.current === 'curious'
                ? 'shadow-[0_0_80px_rgba(6,182,212,0.35)] border-cyan-500/30'
                : 'shadow-[0_0_80px_rgba(59,130,246,0.3)] border-blue-500/30'
              : state === 'connecting'
              ? 'shadow-[0_0_80px_rgba(245,158,11,0.25)] border-amber-500/30'
              : 'shadow-[0_0_50px_rgba(255,255,255,0.05)] hover:border-white/20'
          }`}
        >
          {/* Hover highlight sheen */}
          <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {/* Central Blue/Indigo Reactive Action Button */}
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform group-hover:scale-105 z-20 ${
              state === 'speaking'
                ? emotion.current === 'excited'
                  ? 'bg-gradient-to-tr from-pink-600 to-purple-600 shadow-[0_0_40px_rgba(236,72,153,0.7)] text-white'
                  : 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-[0_0_40px_rgba(168,85,247,0.7)] text-white'
                : state === 'thinking'
                ? 'bg-gradient-to-tr from-indigo-600 to-blue-600 shadow-[0_0_40px_rgba(99,102,241,0.7)] text-white'
                : state === 'listening'
                ? emotion.current === 'curious'
                  ? 'bg-cyan-600 shadow-[0_0_40px_rgba(6,182,212,0.6)] text-white'
                  : 'bg-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.6)] text-white'
                : state === 'connecting'
                ? 'bg-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.5)] text-black'
                : state === 'error'
                ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.5)] text-white'
                : 'bg-zinc-800 border border-white/10 text-zinc-300 group-hover:bg-blue-600 group-hover:text-white shadow-[0_0_20px_rgba(0,0,0,0.5)]'
            }`}
          >
            {state === 'connecting' ? (
              <Sparkles className="w-9 h-9 animate-spin" />
            ) : state === 'thinking' ? (
              <Cpu className="w-9 h-9 animate-pulse text-white" />
            ) : state === 'speaking' ? (
              <svg className="w-10 h-10 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            ) : state === 'listening' ? (
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            ) : (
              <Power className="w-9 h-9" />
            )}
          </div>
        </div>
      </div>

      {/* Sleek Subtitle Status & Contextual Emotion Indicator */}
      <div className="mt-4 flex flex-col items-center gap-2 text-center px-4">
        <div className="flex items-center gap-2">
          <p className="text-2xl font-medium tracking-tight text-white/90">{getMainTitle()}</p>
          {isConnected && getEmotionBadge()}
        </div>
        <p className="text-sm text-blue-400/80 font-mono italic">{getSubSubtitle()}</p>
      </div>
    </div>
  );
};
