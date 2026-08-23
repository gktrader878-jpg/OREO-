import React, { useEffect, useRef, useState } from 'react';
import {
  Brain,
  Mic,
  MicOff,
  Power,
  Sparkles,
  Zap,
  Activity,
  Radio,
  Eye,
  Smile,
  ShieldAlert,
  HelpCircle,
  Flame,
  Volume2
} from 'lucide-react';
import { AssistantState, EmotionState, EmotionType } from '../types';
import { AudioPlayer } from '../services/AudioPlayer';
import { AudioStreamer } from '../services/AudioStreamer';
import { AvatarAnimationController, AvatarMetrics } from '../services/AvatarAnimationController';
import avatarImg from '../assets/images/oreo_avatar_base_1787476710105.jpg';

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
  const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Parallax mouse coordinates (-1 to 1)
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 });
  const mouseTargetRef = useRef({ x: 0, y: 0 });

  // Animation controller instance
  const controllerRef = useRef<AvatarAnimationController>(new AvatarAnimationController());
  const metricsRef = useRef<AvatarMetrics>({
    outputAmplitude: 0,
    inputAmplitude: 0,
    frequencyBands: { bass: 0, mid: 0, treble: 0 },
    isSpeaking: false,
    isListening: false,
    headTilt: 0,
    headTurn: 0,
    headNod: 0,
    breathingOffset: 0.5,
    bodyLeanX: 0,
    bodyLeanY: 0,
    eyeOpenness: 1.0,
    eyeGazeX: 0,
    eyeGazeY: 0,
    eyebrowLeft: 0,
    eyebrowRight: 0,
    mouthOpen: 0,
    mouthWidth: 1.0,
    mouthSmile: 0.2,
    hologramAlpha: 0.95,
    glowIntensity: 0.7,
    scanlineSpeed: 1.0,
    particleActivity: 1.0,
  });

  // State refs for animation loop
  const stateRef = useRef(state);
  const emotionRef = useRef(emotion);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    stateRef.current = state;
    emotionRef.current = emotion;
    isMutedRef.current = isMuted;
  }, [state, emotion, isMuted]);

  // Handle subtle mouse parallax
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

  // Main Render & Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    // Particle pool for holographic ambient dust and data cubes
    const particles: {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      hue: number;
      isCube: boolean;
      rot: number;
      rotSpeed: number;
    }[] = [];

    const PARTICLE_COUNT = 65;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * 800,
        y: Math.random() * 800,
        size: 1.5 + Math.random() * 3,
        speedY: 0.4 + Math.random() * 0.8,
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: 0.2 + Math.random() * 0.6,
        hue: 180 + Math.random() * 40, // Cyan to blue
        isCube: Math.random() > 0.75,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
      });
    }

    const renderLoop = (time: number) => {
      const deltaMs = Math.min(64, time - lastTime);
      lastTime = time;

      // Smooth mouse interpolation
      setMouseParallax((prev) => ({
        x: prev.x + (mouseTargetRef.current.x - prev.x) * 0.08,
        y: prev.y + (mouseTargetRef.current.y - prev.y) * 0.08,
      }));

      // Update avatar metrics
      const metrics = controllerRef.current.update(
        deltaMs,
        stateRef.current,
        audioPlayer,
        audioStreamer,
        emotionRef.current,
        mouseTargetRef.current
      );
      metricsRef.current = metrics;

      // 1. Render Background & Hologram Particle Canvas
      const pCanvas = particleCanvasRef.current;
      if (pCanvas) {
        const ctx = pCanvas.getContext('2d');
        if (ctx) {
          if (pCanvas.width !== pCanvas.clientWidth || pCanvas.height !== pCanvas.clientHeight) {
            pCanvas.width = pCanvas.clientWidth;
            pCanvas.height = pCanvas.clientHeight;
          }

          ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
          const w = pCanvas.width;
          const h = pCanvas.height;
          const cx = w / 2;
          const cy = h / 2;

          // Hologram Projection Conical Light Beam
          const beamGradient = ctx.createLinearGradient(cx, h, cx, cy - 100);
          const beamIntensity = metrics.glowIntensity * 0.25;
          beamGradient.addColorStop(0, `rgba(6, 182, 212, ${beamIntensity * 1.5})`);
          beamGradient.addColorStop(0.5, `rgba(59, 130, 246, ${beamIntensity * 0.8})`);
          beamGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(cx - 180, h);
          ctx.lineTo(cx + 180, h);
          ctx.lineTo(cx + 90, cy - 120);
          ctx.lineTo(cx - 90, cy - 120);
          ctx.closePath();
          ctx.fillStyle = beamGradient;
          ctx.fill();
          ctx.restore();

          // Audio reactive circular wave rings on base pedestal
          const activeVol = stateRef.current === 'speaking' ? metrics.outputAmplitude : metrics.inputAmplitude;
          const ringCount = 4;
          for (let r = 1; r <= ringCount; r++) {
            const ringRadius = 90 + r * 45 + activeVol * 25;
            const ringAlpha = (0.35 / r) * metrics.glowIntensity * (1 + activeVol * 0.8);

            ctx.save();
            ctx.translate(cx, h - 35);
            ctx.scale(1, 0.28); // Isometric projection ellipse
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(6, 182, 212, ${ringAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([8, 6]);
            ctx.stroke();

            // Rotating tick markers
            ctx.rotate(time * 0.0005 * (r % 2 === 0 ? 1 : -1));
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius + 6, 0, Math.PI * 0.4);
            ctx.strokeStyle = `rgba(147, 197, 253, ${ringAlpha * 1.4})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();
          }

          // Render Holographic Particles & Data Dust
          const particleSpeedMult = metrics.particleActivity;
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.y -= p.speedY * particleSpeedMult;
            p.x += p.speedX * particleSpeedMult + Math.sin(time * 0.002 + i) * 0.2;
            p.rot += p.rotSpeed;

            if (p.y < 40) {
              p.y = h - 20;
              p.x = cx + (Math.random() - 0.5) * 450;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            const pAlpha = p.opacity * metrics.hologramAlpha;

            if (p.isCube) {
              ctx.strokeStyle = `hsla(${p.hue}, 90%, 65%, ${pAlpha})`;
              ctx.lineWidth = 1;
              ctx.strokeRect(-p.size, -p.size, p.size * 2, p.size * 2);
            } else {
              ctx.fillStyle = `hsla(${p.hue}, 95%, 70%, ${pAlpha})`;
              ctx.beginPath();
              ctx.arc(0, 0, p.size, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }
      }

      // 2. Render Dynamic Real-Time Facial Rigging (Eyes, Pupils, Eyebrows, Lip-sync)
      const fCanvas = faceCanvasRef.current;
      if (fCanvas) {
        const ctx = fCanvas.getContext('2d');
        if (ctx) {
          const w = fCanvas.width;
          const h = fCanvas.height;
          ctx.clearRect(0, 0, w, h);

          // Face Center coordinates relative to high-res canvas (500x650)
          // Head center is around (250, 245)
          const fx = 250 + metrics.headTurn * 1.8 + metrics.eyeGazeX * 4;
          const fy = 245 + metrics.headNod * 1.5 + metrics.headTilt * 0.8;

          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate((metrics.headTilt * Math.PI) / 180);

          const eyeOpen = metrics.eyeOpenness;
          const gazeX = metrics.eyeGazeX * 5.5;
          const gazeY = metrics.eyeGazeY * 4.5;
          const eyeSpacing = 42; // Distance from head center to each eye
          const eyeY = -18;

          // Helper: Draw Expressive Anime Eye
          const drawAnimeEye = (side: 'left' | 'right') => {
            const sideMult = side === 'left' ? -1 : 1;
            const ex = sideMult * eyeSpacing;
            const ey = eyeY;

            ctx.save();
            ctx.translate(ex, ey);

            // Eye glow aura
            const eyeGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
            eyeGlow.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
            eyeGlow.addColorStop(0.6, 'rgba(6, 182, 212, 0.15)');
            eyeGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
            ctx.fillStyle = eyeGlow;
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.fill();

            // Eye Sclera & Clipping path for Eyelids
            ctx.beginPath();
            const eyeHeight = 15 * Math.max(0.08, eyeOpen);
            ctx.ellipse(0, 0, 14, eyeHeight, 0, 0, Math.PI * 2);
            ctx.clip();

            // Sclera fill (soft blue-tinted dark)
            ctx.fillStyle = '#061320';
            ctx.fill();

            // Pupil / Iris
            ctx.save();
            ctx.translate(gazeX, gazeY);

            // Glowing Iris
            const irisGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 10);
            irisGrad.addColorStop(0, '#a5f3fc'); // Bright cyan center
            irisGrad.addColorStop(0.5, '#06b6d4'); // Electric cyan
            irisGrad.addColorStop(0.85, '#0284c7'); // Deep neon blue
            irisGrad.addColorStop(1, '#082f49');

            ctx.fillStyle = irisGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2);
            ctx.fill();

            // Inner Pupil Core
            ctx.fillStyle = '#021a2d';
            ctx.beginPath();
            ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Specular catchlight reflections (anime luster)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-2.5, -3.5, 2.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(2.8, 2.8, 1.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore(); // restore pupil

            // Upper Eyelash line
            ctx.restore(); // restore eye clip

            ctx.save();
            ctx.translate(ex, ey);
            const lashOffset = (1 - eyeOpen) * 14;
            ctx.strokeStyle = '#041624';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-16, -eyeHeight + lashOffset * 0.4);
            ctx.quadraticCurveTo(0, -eyeHeight - 2 + lashOffset, 16, -eyeHeight + lashOffset * 0.4);
            ctx.stroke();

            // Cyan eyeliner edge
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(-15, -eyeHeight - 1 + lashOffset * 0.4);
            ctx.quadraticCurveTo(0, -eyeHeight - 3.5 + lashOffset, 15, -eyeHeight - 1 + lashOffset * 0.4);
            ctx.stroke();

            ctx.restore();
          };

          // Draw Left & Right Eyes
          drawAnimeEye('left');
          drawAnimeEye('right');

          // Draw Eyebrows (Dynamic articulation reacting to emotion)
          const drawEyebrow = (side: 'left' | 'right', offsetVal: number) => {
            const sideMult = side === 'left' ? -1 : 1;
            const bx = sideMult * eyeSpacing;
            const by = eyeY - 22 - offsetVal * 7;

            ctx.save();
            ctx.translate(bx, by);

            ctx.strokeStyle = '#051b2e';
            ctx.lineWidth = 3.0;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-16, (sideMult * offsetVal * 3) + 2);
            ctx.quadraticCurveTo(0, -3 - offsetVal * 2, 16, (-sideMult * offsetVal * 2) + 2);
            ctx.stroke();

            // Cyan subtle edge
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(-15, (sideMult * offsetVal * 3) + 1);
            ctx.quadraticCurveTo(0, -4 - offsetVal * 2, 15, (-sideMult * offsetVal * 2) + 1);
            ctx.stroke();

            ctx.restore();
          };

          drawEyebrow('left', metrics.eyebrowLeft);
          drawEyebrow('right', metrics.eyebrowRight);

          // Draw Real-Time Lip-Sync Audio Reactive Mouth
          const mouthY = 46;
          const mouthOpen = metrics.mouthOpen;
          const mouthWidth = metrics.mouthWidth;
          const smile = metrics.mouthSmile;

          ctx.save();
          ctx.translate(0, mouthY);

          const halfW = 12 * mouthWidth;
          const openH = 18 * mouthOpen;

          if (mouthOpen > 0.08) {
            // Speaking Active Mouth Shape
            ctx.beginPath();
            ctx.moveTo(-halfW, 0);
            // Upper lip curve
            ctx.quadraticCurveTo(0, -openH * 0.25 - smile * 3, halfW, 0);
            // Lower lip curve (drops with bass/amplitude)
            ctx.quadraticCurveTo(0, openH * 1.3 - smile * 2, -halfW, 0);
            ctx.closePath();

            // Inner mouth dark cavity
            const mouthInnerGrad = ctx.createLinearGradient(0, -openH * 0.2, 0, openH);
            mouthInnerGrad.addColorStop(0, '#0c1a29');
            mouthInnerGrad.addColorStop(0.6, '#182b3d');
            mouthInnerGrad.addColorStop(1, '#0e4a68');
            ctx.fillStyle = mouthInnerGrad;
            ctx.fill();

            // Teeth highlight (clean anime style)
            if (openH > 5) {
              ctx.fillStyle = 'rgba(230, 245, 255, 0.9)';
              ctx.beginPath();
              ctx.rect(-halfW * 0.55, -1, halfW * 1.1, Math.min(3.5, openH * 0.35));
              ctx.fill();
            }

            // Glowing blue tongue / speech energy resonance
            if (openH > 8) {
              ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
              ctx.beginPath();
              ctx.ellipse(0, openH * 0.7, halfW * 0.45, openH * 0.35, 0, 0, Math.PI * 2);
              ctx.fill();
            }

            // Lip outline
            ctx.strokeStyle = '#041624';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Cyan acoustic resonance lip glow
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
            ctx.lineWidth = 1.0;
            ctx.stroke();
          } else {
            // Closed Resting Anime Mouth with Smile/Expression
            ctx.strokeStyle = '#041624';
            ctx.lineWidth = 2.8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-halfW, -smile * 3);
            ctx.quadraticCurveTo(0, smile * 4, halfW, -smile * 3);
            ctx.stroke();

            // Underlip shadow
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-4, 6);
            ctx.quadraticCurveTo(0, 7.5, 4, 6);
            ctx.stroke();
          }

          ctx.restore(); // restore mouth

          ctx.restore(); // restore face canvas
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [audioPlayer, audioStreamer]);

  // Current Emotion Configuration for Sci-Fi HUD
  const getEmotionConfig = (type: EmotionType) => {
    switch (type) {
      case 'happy':
      case 'amused':
        return { label: 'Happy', color: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10', icon: Smile };
      case 'excited':
        return { label: 'Excited', color: 'text-amber-300 border-amber-500/30 bg-amber-500/10', icon: Flame };
      case 'curious':
        return { label: 'Curious', color: 'text-purple-300 border-purple-500/30 bg-purple-500/10', icon: HelpCircle };
      case 'concerned':
      case 'empathetic':
        return { label: 'Concerned', color: 'text-blue-300 border-blue-500/30 bg-blue-500/10', icon: ShieldAlert };
      case 'serious':
        return { label: 'Focused', color: 'text-indigo-300 border-indigo-500/30 bg-indigo-500/10', icon: Eye };
      case 'thoughtful':
        return { label: 'Thoughtful', color: 'text-violet-300 border-violet-500/30 bg-violet-500/10', icon: Brain };
      case 'surprised':
        return { label: 'Surprised', color: 'text-pink-300 border-pink-500/30 bg-pink-500/10', icon: Sparkles };
      case 'calm':
      case 'confident':
      default:
        return { label: 'Attentive', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5', icon: Zap };
    }
  };

  const emotionInfo = getEmotionConfig(emotion.current as EmotionType);
  const EmotionIcon = emotionInfo.icon;

  const isConnected = state === 'listening' || state === 'thinking' || state === 'speaking' || state === 'connecting';

  return (
    <div
      id="oreo-holographic-stage"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* 1. Background Particle & Hologram Conical Beam Canvas */}
      <canvas
        ref={particleCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* 2. Floating Futuristic HUD Telemetry Panels (Parallax Layer 1) */}
      <div
        className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center"
        style={{
          transform: `translate3d(${mouseParallax.x * -18}px, ${mouseParallax.y * -14}px, 0)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Left Floating Holographic Widget: Neural State */}
        <div className="absolute left-6 md:left-14 top-1/3 -translate-y-1/2 p-3 rounded-2xl bg-black/40 border border-cyan-500/20 backdrop-blur-md hidden sm:flex flex-col gap-2 shadow-[0_0_25px_rgba(6,182,212,0.1)]">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold">
              NEURAL MATRIX
            </span>
          </div>

          <div className="space-y-1 text-[10px] font-mono text-zinc-400">
            <div className="flex items-center justify-between gap-4">
              <span>STATE:</span>
              <span className="text-white uppercase font-bold">{state}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>CORE:</span>
              <span className="text-cyan-400">GEMINI LIVE</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>LATENCY:</span>
              <span className="text-emerald-400">~14ms</span>
            </div>
          </div>

          {/* Equalizer Frequency Bars */}
          <div className="flex items-end gap-1 h-5 pt-1">
            {[40, 75, 55, 90, 60, 85, 30].map((h, i) => {
              const activeH = isConnected
                ? state === 'speaking'
                  ? Math.min(100, h * (assistantVolume * 2.5 + 0.2))
                  : state === 'listening'
                  ? Math.min(100, h * (userVolume * 2.5 + 0.15))
                  : h * 0.3
                : 15;
              return (
                <div
                  key={i}
                  className="w-1.5 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-full transition-all duration-75"
                  style={{ height: `${activeH}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Right Floating Holographic Widget: Emotion & Biometrics */}
        <div className="absolute right-6 md:right-14 top-1/3 -translate-y-1/2 p-3 rounded-2xl bg-black/40 border border-cyan-500/20 backdrop-blur-md hidden sm:flex flex-col gap-2 shadow-[0_0_25px_rgba(6,182,212,0.1)]">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold">
              AI AFFECT
            </span>
          </div>

          <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${emotionInfo.color}`}>
            <EmotionIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{emotionInfo.label}</span>
          </div>

          <div className="text-[10px] font-mono text-zinc-500 max-w-[120px] leading-tight">
            {emotion.reason || 'Listening attentively to conversational nuances.'}
          </div>
        </div>

        {/* Outer Circular Reticle Ring around Character */}
        <div className="w-[360px] h-[360px] md:w-[480px] md:h-[480px] rounded-full border border-cyan-500/10 absolute pointer-events-none animate-[spin_60s_linear_infinite]" />
        <div className="w-[420px] h-[420px] md:w-[560px] md:h-[560px] rounded-full border border-dashed border-cyan-500/15 absolute pointer-events-none animate-[spin_40s_linear_infinite_reverse]" />
      </div>

      {/* 3. Central Character Holographic Projection Chamber */}
      <div
        onClick={onAvatarClick}
        className="relative z-20 w-full max-w-[340px] sm:max-w-[420px] md:max-w-[480px] h-[480px] sm:h-[560px] md:h-[620px] flex items-center justify-center cursor-pointer group"
        style={{
          transform: `translate3d(${mouseParallax.x * 12}px, ${mouseParallax.y * 8}px, 0)`,
          transition: 'transform 0.12s cubic-bezier(0.1, 0.9, 0.2, 1)',
        }}
      >
        {/* Holographic Aura / Backlight glow */}
        <div
          className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 pointer-events-none ${
            state === 'speaking'
              ? 'bg-cyan-500/25 scale-105'
              : state === 'listening'
              ? 'bg-blue-500/20 scale-100'
              : state === 'thinking'
              ? 'bg-purple-500/20 scale-100'
              : 'bg-cyan-950/20 scale-95'
          }`}
        />

        {/* Character Visual Container with Organic Breathing Kinetics */}
        <div
          className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-3xl"
          style={{
            transform: `translateY(${
              state === 'disconnected' ? 10 : Math.sin(Date.now() * 0.0016) * 4
            }px) scale(${1 + (state === 'speaking' ? assistantVolume * 0.03 : 0)})`,
            transition: 'transform 0.15s ease-out',
          }}
        >
          {/* Base Character Illustration with Hologram Shaders */}
          <img
            src={avatarImg}
            alt="OREO AI Holographic Avatar"
            referrerPolicy="no-referrer"
            className={`w-full h-full object-contain select-none transition-all duration-500 ${
              state === 'disconnected'
                ? 'opacity-40 grayscale contrast-125 brightness-75'
                : state === 'connecting'
                ? 'opacity-85 brightness-110 animate-pulse'
                : 'opacity-95 brightness-105 group-hover:brightness-110'
            }`}
            style={{
              filter: `drop-shadow(0 0 20px rgba(6, 182, 212, ${
                state === 'speaking' ? 0.6 : state === 'listening' ? 0.45 : 0.25
              }))`,
            }}
          />

          {/* Dynamic Real-Time Facial Rigging Canvas Overlay (Eyes, Pupils, Eyebrows, Lip-Sync Mouth) */}
          <canvas
            ref={faceCanvasRef}
            width={500}
            height={650}
            className="absolute inset-0 w-full h-full pointer-events-none z-30"
          />

          {/* Hologram Scanlines Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none opacity-35 z-40" />

          {/* Vertical Hologram Light Streaks */}
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-cyan-500/15 pointer-events-none z-40" />

          {/* Micro Digital Glitch Bar when Connecting / Thinking */}
          {state === 'thinking' && (
            <div className="absolute inset-x-0 h-1 bg-cyan-400/40 blur-sm pointer-events-none animate-[scanline_2s_linear_infinite] z-50" />
          )}

          {/* Offline Holographic Prompt when Disconnected */}
          {state === 'disconnected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs z-50 p-6 text-center animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_30px_rgba(6,182,212,0.3)] group-hover:scale-110 transition-transform">
                <Power className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-white tracking-wide">
                OREO HOLOGRAM OFFLINE
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                Click here or tap the microphone below to initialize real-time holographic link.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Holographic Projection Pedestal & Status Pill */}
      <div className="relative z-20 flex flex-col items-center mt-[-10px] sm:mt-[-20px] gap-2">
        {/* Hologram Base Beam Ring */}
        <div className="w-48 sm:w-64 h-3 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_25px_rgba(6,182,212,0.8)] opacity-75" />

        {/* State Interactive Indicator Badge */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#090d14]/90 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.2)]">
          {/* Animated Status Pulse */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                state === 'speaking'
                  ? 'bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-ping'
                  : state === 'listening'
                  ? 'bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse'
                  : state === 'thinking'
                  ? 'bg-purple-400 shadow-[0_0_10px_#c084fc] animate-pulse'
                  : state === 'connecting'
                  ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24] animate-spin'
                  : 'bg-zinc-600'
              }`}
            />
            <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              {state === 'speaking'
                ? 'OREO Speaking'
                : state === 'listening'
                ? isMuted
                  ? 'Mic Muted'
                  : 'Listening...'
                : state === 'thinking'
                ? 'Thinking...'
                : state === 'connecting'
                ? 'Calibrating Hologram...'
                : 'Standby Mode'}
            </span>
          </div>

          {/* Voice amplitude meter when speaking / listening */}
          {isConnected && (
            <div className="flex items-center gap-1 pl-2 border-l border-white/10">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-mono text-cyan-300">
                {state === 'speaking'
                  ? `${Math.round(assistantVolume * 100)}%`
                  : `${Math.round(userVolume * 100)}%`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
