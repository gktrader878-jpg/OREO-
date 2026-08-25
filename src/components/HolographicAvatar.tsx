import React, { useEffect, useRef, useState } from 'react';
import {
  Brain,
  Power,
  Sparkles,
  Zap,
  Activity,
  Volume2,
  Play,
  Upload,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { AssistantState, EmotionState, EmotionType } from '../types';
import { AudioPlayer } from '../services/AudioPlayer';
import { AudioStreamer } from '../services/AudioStreamer';
import { HolographicProjectionPlatform } from './HolographicProjectionPlatform';
import { HolographicCoreVisualizer } from './HolographicCoreVisualizer';

interface HolographicAvatarProps {
  state: AssistantState;
  audioPlayer: AudioPlayer;
  audioStreamer: AudioStreamer;
  userVolume: number;
  assistantVolume: number;
  emotion?: EmotionState;
  isMuted: boolean;
  onAvatarClick?: () => void;
}

export const HolographicAvatar: React.FC<HolographicAvatarProps> = ({
  state,
  audioPlayer,
  audioStreamer,
  userVolume,
  assistantVolume,
  emotion = { current: 'neutral', intensity: 0, reason: 'Initial baseline', updatedAt: Date.now() },
  isMuted,
  onAvatarClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);

  // Parallax mouse coordinates (-1 to 1)
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 });
  const mouseTargetRef = useRef({ x: 0, y: 0 });

  // State refs for animation loop
  const stateRef = useRef(state);
  const assistantVolumeRef = useRef(assistantVolume);
  const userVolumeRef = useRef(userVolume);

  useEffect(() => {
    stateRef.current = state;
    assistantVolumeRef.current = assistantVolume;
    userVolumeRef.current = userVolume;
  }, [state, assistantVolume, userVolume]);

  // Video Autoplay & Playback Initialization (only if a valid custom video is selected)
  useEffect(() => {
    if (!customVideoUrl) return;

    const video = videoRef.current;
    if (!video) return;

    video.muted = true; // Required for reliable autoplay
    video.loop = true;
    video.playsInline = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsVideoPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(() => {
          setIsVideoPlaying(false);
          setAutoplayBlocked(true);
        });
    }
  }, [customVideoUrl]);

  // Mouse Parallax movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    mouseTargetRef.current = {
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    };
  };

  const handleMouseLeave = () => {
    mouseTargetRef.current = { x: 0, y: 0 };
  };

  // Custom Video Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomVideoUrl(url);
      setAutoplayBlocked(false);
    }
  };

  // Explicit Video Play trigger
  const handleStartHologramVideo = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (video && customVideoUrl) {
      video.muted = true;
      video.play().then(() => {
        setIsVideoPlaying(true);
        setAutoplayBlocked(false);
      }).catch(() => {
        setIsVideoPlaying(false);
      });
    }
  };

  // Background Ambient Particles Animation Loop
  useEffect(() => {
    let animationFrameId: number;

    const embers: {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      hue: number;
      pulsePhase: number;
    }[] = [];

    const EMBER_COUNT = 45;
    for (let i = 0; i < EMBER_COUNT; i++) {
      embers.push({
        x: Math.random() * 1000,
        y: Math.random() * 800,
        size: 1.2 + Math.random() * 2.8,
        speedY: 0.3 + Math.random() * 0.7,
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: 0.15 + Math.random() * 0.65,
        hue: Math.random() > 0.3 ? 185 + Math.random() * 30 : 260 + Math.random() * 30, // Cyan & violet sparks
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    const renderLoop = (time: number) => {
      // Smooth parallax interpolation
      setMouseParallax((prev) => ({
        x: prev.x + (mouseTargetRef.current.x - prev.x) * 0.08,
        y: prev.y + (mouseTargetRef.current.y - prev.y) * 0.08,
      }));

      const canvas = particleCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          const cx = w / 2;
          const cy = h / 2;
          const currentState = stateRef.current;
          const isSpeaking = currentState === 'speaking';
          const isThinking = currentState === 'thinking';
          const activeVol = isSpeaking ? assistantVolumeRef.current : userVolumeRef.current;

          // Radial Holographic Core Lighting Aura
          const glowRadius = isSpeaking ? 420 : isThinking ? 380 : 320;
          const beamGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, glowRadius);
          const glowAlpha = isSpeaking ? 0.18 + activeVol * 0.2 : isThinking ? 0.15 : 0.08;
          beamGrad.addColorStop(0, `rgba(6, 182, 212, ${glowAlpha})`);
          beamGrad.addColorStop(0.5, `rgba(59, 130, 246, ${glowAlpha * 0.4})`);
          beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = beamGrad;
          ctx.fillRect(0, 0, w, h);

          // Render Ambient Floating Holographic Particles
          const speedMultiplier = isSpeaking ? 1.8 : isThinking ? 1.5 : 1.0;
          for (let i = 0; i < embers.length; i++) {
            const e = embers[i];
            e.y -= e.speedY * speedMultiplier * (1 + activeVol * 0.7);
            e.x += e.speedX + Math.sin(time * 0.0015 + e.pulsePhase) * 0.25;
            e.pulsePhase += 0.03;

            if (e.y < 20) {
              e.y = h - 20;
              e.x = cx + (Math.random() - 0.5) * 600;
            }

            const currentAlpha = e.opacity * (0.6 + 0.4 * Math.sin(e.pulsePhase)) * (isSpeaking ? 1.2 : 0.85);

            ctx.save();
            ctx.fillStyle = `hsla(${e.hue}, 90%, 65%, ${Math.min(1, currentAlpha)})`;
            ctx.shadowColor = `hsla(${e.hue}, 95%, 60%, 0.8)`;
            ctx.shadowBlur = isSpeaking ? 10 : 6;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Emotion telemetry config
  const getEmotionConfig = (type: EmotionType) => {
    switch (type) {
      case 'happy':
        return { label: 'Harmonious', color: 'text-amber-300 border-amber-500/30 bg-amber-500/10', icon: Sparkles };
      case 'excited':
        return { label: 'High Resonance', color: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/15', icon: Zap };
      case 'thoughtful':
        return { label: 'Processing', color: 'text-violet-300 border-violet-500/30 bg-violet-500/10', icon: Brain };
      case 'confident':
        return { label: 'Optimal', color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10', icon: Zap };
      case 'calm':
      case 'neutral':
      default:
        return { label: 'Active Matrix', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5', icon: Activity };
    }
  };

  const emotionInfo = getEmotionConfig(emotion.current as EmotionType);
  const EmotionIcon = emotionInfo.icon;
  const isConnected = state === 'listening' || state === 'thinking' || state === 'speaking' || state === 'connecting';

  return (
    <div
      id="oreo-hologram-stage"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* Hidden File Input for Custom Hologram Video */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* 1. Cinematic Holographic Floor Projection Matrix */}
      <HolographicProjectionPlatform
        state={state}
        userVolume={userVolume}
        assistantVolume={assistantVolume}
        emotion={emotion?.current as EmotionType}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-80"
      />

      {/* 2. Atmospheric Luminous Embers & Environment Light Field Canvas */}
      <canvas
        ref={particleCanvasRef}
        width={1000}
        height={800}
        className="absolute inset-0 w-full h-full pointer-events-none z-1"
      />

      {/* 3. Central Holographic Video / Core Projection Container */}
      <div
        onClick={onAvatarClick}
        className="relative z-20 w-full max-w-2xl md:max-w-3xl lg:max-w-4xl h-[340px] sm:h-[420px] md:h-[480px] lg:h-[540px] flex items-center justify-center cursor-pointer group px-4"
        style={{
          transform: `translate3d(${mouseParallax.x * 12}px, ${mouseParallax.y * 8}px, 0)`,
          transition: 'transform 0.12s cubic-bezier(0.1, 0.9, 0.2, 1)',
        }}
      >
        {/* Soft Volumetric Holographic Glow Aura (Surrounding Environment) */}
        <div
          className={`absolute inset-0 rounded-3xl blur-3xl transition-all duration-700 pointer-events-none ${
            state === 'speaking'
              ? 'bg-cyan-500/25 scale-105 shadow-[0_0_60px_rgba(6,182,212,0.3)]'
              : state === 'listening'
              ? 'bg-emerald-500/20 scale-100 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
              : state === 'thinking'
              ? 'bg-purple-500/20 scale-100 shadow-[0_0_45px_rgba(168,85,247,0.2)]'
              : 'bg-cyan-950/20 scale-95'
          }`}
        />

        {/* Video / Procedural Hologram Display Shell */}
        <div
          className={`relative w-full h-full flex items-center justify-center overflow-hidden rounded-2xl md:rounded-3xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm transition-all duration-500 ${
            state === 'disconnected'
              ? 'opacity-70'
              : state === 'connecting'
              ? 'opacity-85 animate-pulse'
              : 'opacity-100'
          }`}
          style={{
            boxShadow: `0 0 35px rgba(6, 182, 212, ${
              state === 'speaking' ? 0.35 : state === 'listening' ? 0.25 : 0.15
            })`,
          }}
        >
          {customVideoUrl ? (
            /* Custom Video Stream If Provided */
            <video
              ref={videoRef}
              src={customVideoUrl}
              autoPlay
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              onError={() => {
                setCustomVideoUrl(null);
                setIsVideoPlaying(false);
              }}
              className={`w-full h-full object-contain select-none transition-all duration-700 ${
                state === 'disconnected' ? 'brightness-75' : 'brightness-105'
              }`}
            />
          ) : (
            /* Default Procedural Quantum Hologram Core Matrix */
            <HolographicCoreVisualizer
              state={state}
              userVolume={userVolume}
              assistantVolume={assistantVolume}
              emotion={emotion?.current as EmotionType}
              className="w-full h-full"
            />
          )}

          {/* Environmental Subtle Holographic Light Beam & Edge Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/30 via-transparent to-cyan-950/20 pointer-events-none z-10" />

          {/* Autoplay Blocked / Click to Activate Prompt for Custom Video */}
          {customVideoUrl && autoplayBlocked && !isVideoPlaying && (
            <div
              onClick={handleStartHologramVideo}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md p-6 text-center cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-3 shadow-[0_0_25px_rgba(6,182,212,0.4)] group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </div>
              <h4 className="text-sm font-semibold text-white tracking-wide">
                INITIALIZE HOLOGRAPHIC STREAM
              </h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Click anywhere to activate continuous video playback.
              </p>
            </div>
          )}

          {/* Disconnected Hologram Overlay */}
          {state === 'disconnected' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[1px] p-6 text-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 mb-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <Power className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wider">
                OREO SYSTEM STANDBY
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Click hologram core or tap microphone below to begin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Minimalist Status Pill & Telemetry Badge */}
      <div className="relative z-20 flex items-center justify-center mt-2 gap-3">
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#080d15]/90 border border-cyan-500/25 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          {/* Status Indicator Pulse */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                state === 'speaking'
                  ? 'bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-ping'
                  : state === 'listening'
                  ? 'bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse'
                  : state === 'thinking'
                  ? 'bg-purple-400 shadow-[0_0_12px_#c084fc] animate-pulse'
                  : state === 'connecting'
                  ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b] animate-pulse'
                  : 'bg-zinc-600'
              }`}
            />
            <span className="text-xs font-mono tracking-wider text-zinc-200 uppercase font-semibold">
              {state === 'speaking'
                ? 'Speaking'
                : state === 'listening'
                ? isMuted
                  ? 'Mic Muted'
                  : 'Listening'
                : state === 'thinking'
                ? 'Thinking...'
                : state === 'connecting'
                ? 'Connecting Live...'
                : 'Standby'}
            </span>
          </div>

          {/* Current Affect Tag */}
          {isConnected && (
            <div className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium flex items-center gap-1 ${emotionInfo.color}`}>
              <EmotionIcon className="w-3 h-3" />
              <span>{emotionInfo.label}</span>
            </div>
          )}

          {/* Voice Amplitude readout */}
          {isConnected && (
            <div className="flex items-center gap-1 pl-2 border-l border-white/10">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-75"
                  style={{
                    width: `${Math.min(
                      100,
                      (state === 'speaking' ? assistantVolume : userVolume) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Custom Video Switcher Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            title="Load custom hologram video (.mp4, .webm)"
            className="text-zinc-400 hover:text-cyan-300 transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

