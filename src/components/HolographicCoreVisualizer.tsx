import React, { useEffect, useRef } from 'react';
import { AssistantState, EmotionType } from '../types';

interface HolographicCoreVisualizerProps {
  state: AssistantState;
  userVolume: number;
  assistantVolume: number;
  emotion?: EmotionType;
  className?: string;
}

export const HolographicCoreVisualizer: React.FC<HolographicCoreVisualizerProps> = ({
  state,
  userVolume,
  assistantVolume,
  emotion = 'calm',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const userVolRef = useRef(userVolume);
  const asstVolRef = useRef(assistantVolume);
  const emotionRef = useRef(emotion);

  useEffect(() => {
    stateRef.current = state;
    userVolRef.current = userVolume;
    asstVolRef.current = assistantVolume;
    emotionRef.current = emotion;
  }, [state, userVolume, assistantVolume, emotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle1 = 0;
    let angle2 = 0;
    let angle3 = 0;
    let angle4 = 0;
    let pulsePhase = 0;

    // Node particles for neural nexus web
    const nodes: {
      baseAngle: number;
      dist: number;
      size: number;
      speed: number;
      phase: number;
    }[] = [];

    for (let i = 0; i < 28; i++) {
      nodes.push({
        baseAngle: (i / 28) * Math.PI * 2,
        dist: 70 + Math.random() * 90,
        size: 1.5 + Math.random() * 2.5,
        speed: (Math.random() - 0.5) * 0.008,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const render = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const curState = stateRef.current;
      const uVol = userVolRef.current;
      const aVol = asstVolRef.current;
      const activeVol = curState === 'speaking' ? aVol : curState === 'listening' ? uVol : 0;

      // Color paletting by state & emotion
      let primaryHue = 190; // Cyan
      let secondaryHue = 220; // Neon Blue
      let accentHue = 275; // Violet

      if (curState === 'speaking') {
        primaryHue = 185;
        secondaryHue = 210;
        accentHue = 260;
      } else if (curState === 'listening') {
        primaryHue = 155; // Emerald / Mint
        secondaryHue = 190;
        accentHue = 210;
      } else if (curState === 'thinking') {
        primaryHue = 270; // Violet
        secondaryHue = 290;
        accentHue = 190;
      } else if (curState === 'connecting') {
        primaryHue = 40; // Amber
        secondaryHue = 25;
        accentHue = 190;
      } else if (curState === 'disconnected') {
        primaryHue = 200;
        secondaryHue = 215;
        accentHue = 230;
      }

      const speedMult =
        curState === 'speaking'
          ? 1.8 + activeVol * 3.0
          : curState === 'listening'
          ? 1.3 + activeVol * 2.0
          : curState === 'thinking'
          ? 1.5
          : curState === 'connecting'
          ? 2.0
          : 0.5;

      angle1 += 0.008 * speedMult;
      angle2 -= 0.006 * speedMult;
      angle3 += 0.004 * speedMult;
      angle4 -= 0.012 * speedMult;
      pulsePhase += 0.04 * speedMult;

      const baseRadius = Math.min(width, height) * 0.22;
      const dynamicRadius = baseRadius * (1 + activeVol * 0.45 + Math.sin(pulsePhase) * 0.04);

      // 1. Central Ambient Volumetric Core Glow
      const glowGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, dynamicRadius * 2.2);
      const glowAlpha = curState === 'disconnected' ? 0.08 : 0.22 + activeVol * 0.35;
      glowGrad.addColorStop(0, `hsla(${primaryHue}, 95%, 65%, ${glowAlpha})`);
      glowGrad.addColorStop(0.4, `hsla(${secondaryHue}, 90%, 55%, ${glowAlpha * 0.5})`);
      glowGrad.addColorStop(0.8, `hsla(${accentHue}, 80%, 45%, ${glowAlpha * 0.15})`);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, dynamicRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Multi-layer Holographic Orbital Gyroscope Rings
      const drawRing = (
        radius: number,
        angle: number,
        dashPattern: number[],
        lineWidth: number,
        hue: number,
        alpha: number
      ) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.setLineDash(dashPattern);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = `hsla(${hue}, 85%, 60%, ${alpha})`;
        ctx.shadowColor = `hsla(${hue}, 95%, 65%, ${alpha * 0.8})`;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();
      };

      const ringAlpha = curState === 'disconnected' ? 0.25 : 0.65 + activeVol * 0.35;

      // Outer HUD Bracket Ring
      drawRing(dynamicRadius * 1.55, angle3, [12, 28, 4, 28], 1.5, primaryHue, ringAlpha * 0.7);
      // Segmented Frequency Ring
      drawRing(dynamicRadius * 1.32, angle2, [40, 16, 8, 16], 2.0, secondaryHue, ringAlpha * 0.85);
      // Precision Calibrator Ring
      drawRing(dynamicRadius * 1.1, angle1, [6, 10], 1.2, primaryHue, ringAlpha);
      // Inner Cybernetic Vortex Ring
      drawRing(dynamicRadius * 0.75, angle4, [24, 12, 12, 12], 2.2, accentHue, ringAlpha * 0.9);

      // 3. Audio Reactive Waveform Perimeter Arcs
      const arcSegments = 64;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle1 * 0.5);

      for (let i = 0; i < arcSegments; i++) {
        const theta = (i / arcSegments) * Math.PI * 2;
        const waveOffset = Math.sin(theta * 8 + pulsePhase * 2) * (8 + activeVol * 30);
        const r1 = dynamicRadius * 1.18 + waveOffset;
        const r2 = r1 + (activeVol > 0.05 ? Math.random() * activeVol * 25 : 3);

        const x1 = Math.cos(theta) * r1;
        const y1 = Math.sin(theta) * r1;
        const x2 = Math.cos(theta) * r2;
        const y2 = Math.sin(theta) * r2;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `hsla(${primaryHue + (i % 20)}, 90%, 65%, ${ringAlpha * 0.75})`;
        ctx.stroke();
      }
      ctx.restore();

      // 4. Neural Nexus Node Web
      ctx.save();
      ctx.translate(cx, cy);

      const nodeCoords: { x: number; y: number; size: number; hue: number }[] = [];
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const currentAngle = n.baseAngle + angle2 * 0.6 + n.phase;
        const d = (n.dist + Math.sin(pulsePhase + i) * 12) * (1 + activeVol * 0.2);
        const nx = Math.cos(currentAngle) * d;
        const ny = Math.sin(currentAngle) * d;

        nodeCoords.push({
          x: nx,
          y: ny,
          size: n.size * (1 + activeVol * 0.5),
          hue: i % 2 === 0 ? primaryHue : accentHue,
        });

        // Draw node
        ctx.beginPath();
        ctx.arc(nx, ny, n.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${i % 2 === 0 ? primaryHue : accentHue}, 90%, 70%, ${ringAlpha})`;
        ctx.shadowColor = `hsla(${primaryHue}, 90%, 60%, 0.8)`;
        ctx.shadowBlur = 8;
        ctx.fill();
      }

      // Draw interconnecting neural filaments
      for (let i = 0; i < nodeCoords.length; i++) {
        for (let j = i + 1; j < nodeCoords.length; j++) {
          const dx = nodeCoords[i].x - nodeCoords[j].x;
          const dy = nodeCoords[i].y - nodeCoords[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 65) {
            const lineAlpha = (1 - dist / 65) * 0.35 * ringAlpha;
            ctx.beginPath();
            ctx.moveTo(nodeCoords[i].x, nodeCoords[i].y);
            ctx.lineTo(nodeCoords[j].x, nodeCoords[j].y);
            ctx.strokeStyle = `hsla(${primaryHue}, 80%, 65%, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // 5. Central AI Cybernetic Eye & Quantum Core
      const coreR = dynamicRadius * 0.45;
      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreR);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, `hsla(${primaryHue}, 100%, 75%, 0.95)`);
      coreGrad.addColorStop(0.7, `hsla(${secondaryHue}, 90%, 55%, 0.7)`);
      coreGrad.addColorStop(1, `hsla(${accentHue}, 85%, 40%, 0)`);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = `hsla(${primaryHue}, 100%, 60%, 0.9)`;
      ctx.shadowBlur = 25;
      ctx.fill();

      // Inner Core Iris Lattice
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full object-contain pointer-events-none select-none ${className}`}
    />
  );
};
