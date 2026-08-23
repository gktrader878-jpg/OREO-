import React, { useEffect, useRef } from 'react';
import { AssistantState, EmotionType } from '../types';

interface HolographicProjectionPlatformProps {
  state: AssistantState;
  userVolume: number;
  assistantVolume: number;
  frequencyBands?: { bass: number; mid: number; treble: number };
  glowIntensity?: number;
  emotion?: EmotionType;
  className?: string;
}

export const HolographicProjectionPlatform: React.FC<HolographicProjectionPlatformProps> = ({
  state,
  userVolume,
  assistantVolume,
  frequencyBands = { bass: 0, mid: 0, treble: 0 },
  glowIntensity = 0.8,
  emotion = 'calm',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const stateRef = useRef(state);
  const userVolRef = useRef(userVolume);
  const asstVolRef = useRef(assistantVolume);
  const bandsRef = useRef(frequencyBands);
  const glowRef = useRef(glowIntensity);
  const emotionRef = useRef(emotion);

  useEffect(() => {
    stateRef.current = state;
    userVolRef.current = userVolume;
    asstVolRef.current = assistantVolume;
    bandsRef.current = frequencyBands;
    glowRef.current = glowIntensity;
    emotionRef.current = emotion;
  }, [state, userVolume, assistantVolume, frequencyBands, glowIntensity, emotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let rotOuterCW = 0;
    let rotMiddleCCW = 0;
    let rotInnerCW = 0;
    let rotGeometryCCW = 0;
    let rotCoreVortex = 0;
    let pulsePhase = 0;

    // Upward beam particles originating from platform rings
    const beamParticles: {
      x: number;
      y: number;
      z: number; // depth
      radius: number;
      speedY: number;
      opacity: number;
      hue: number;
      size: number;
    }[] = [];

    const PARTICLE_COUNT = 45;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 220;
      beamParticles.push({
        x: Math.cos(angle) * dist,
        y: Math.random() * 320,
        z: Math.sin(angle) * dist,
        radius: dist,
        speedY: 0.8 + Math.random() * 1.5,
        opacity: 0.2 + Math.random() * 0.8,
        hue: 185 + Math.random() * 35, // Cyan/neon blue/light violet
        size: 1.2 + Math.random() * 2.5,
      });
    }

    // Audio reactive shockwave rings
    const shockwaves: { radius: number; maxRadius: number; opacity: number; speed: number }[] = [];

    const render = (currentTime: number) => {
      const delta = Math.min(64, currentTime - lastTime);
      lastTime = currentTime;

      const currentState = stateRef.current;
      const isConnected = currentState !== 'disconnected';
      const uVol = userVolRef.current;
      const aVol = asstVolRef.current;
      const bands = bandsRef.current;
      const activeVol = currentState === 'speaking' ? aVol : currentState === 'listening' ? uVol : 0;
      const glow = glowRef.current;

      // Speed multipliers based on active state
      let speedMult = 1.0;
      if (currentState === 'speaking') {
        speedMult = 1.6 + aVol * 2.5;
      } else if (currentState === 'listening') {
        speedMult = 1.2 + uVol * 1.8;
      } else if (currentState === 'thinking') {
        speedMult = 1.4;
      } else if (currentState === 'disconnected') {
        speedMult = 0.35;
      }

      // Rotate independent ring layers
      rotOuterCW += (0.0004 * delta * speedMult) % (Math.PI * 2);
      rotMiddleCCW -= (0.00065 * delta * speedMult) % (Math.PI * 2);
      rotGeometryCCW -= (0.00035 * delta * speedMult) % (Math.PI * 2);
      rotInnerCW += (0.0009 * delta * speedMult) % (Math.PI * 2);
      rotCoreVortex -= (0.0018 * delta * speedMult) % (Math.PI * 2);
      pulsePhase += 0.003 * delta;

      // Spawn soundwave ripples on active audio peaks
      if (currentState === 'speaking' && aVol > 0.3 && Math.random() < 0.12) {
        shockwaves.push({ radius: 20, maxRadius: 260, opacity: 0.9, speed: 2.2 + aVol * 3.5 });
      } else if (currentState === 'listening' && uVol > 0.25 && Math.random() < 0.1) {
        shockwaves.push({ radius: 20, maxRadius: 230, opacity: 0.8, speed: 1.8 + uVol * 3.0 });
      }

      // Resize canvas if needed
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height * 0.72; // Position on floor beneath avatar

      // 3D Isometric Projection scale: Compress Y to 0.32 to simulate 3D floor perspective
      const isoY = 0.33;

      // Color scheme based on emotion and state
      let primaryColor = '6, 182, 212'; // Cyan
      let secondaryColor = '59, 130, 246'; // Neon Blue
      let accentColor = '168, 85, 247'; // Violet

      if (currentState === 'thinking') {
        primaryColor = '168, 85, 247';
        secondaryColor = '139, 92, 246';
        accentColor = '6, 182, 212';
      } else if (currentState === 'listening') {
        primaryColor = '52, 211, 153';
        secondaryColor = '6, 182, 212';
        accentColor = '96, 165, 250';
      } else if (emotionRef.current === 'excited') {
        accentColor = '245, 158, 11';
      }

      const baseAlpha = isConnected ? 0.95 : 0.35;

      // ────────────────────────────────────────────────────────
      // 1. VOLUMETRIC VERTICAL ENERGY CONE / LIGHT COLUMN
      // ────────────────────────────────────────────────────────
      if (isConnected) {
        const coneHeight = height * 0.85;
        const coneGrad = ctx.createLinearGradient(centerX, centerY, centerX, centerY - coneHeight);
        const beamAlpha = (0.2 + activeVol * 0.35 + Math.sin(pulsePhase) * 0.05) * glow;

        coneGrad.addColorStop(0, `rgba(${primaryColor}, ${beamAlpha * 1.6})`);
        coneGrad.addColorStop(0.3, `rgba(${secondaryColor}, ${beamAlpha * 0.9})`);
        coneGrad.addColorStop(0.7, `rgba(${accentColor}, ${beamAlpha * 0.3})`);
        coneGrad.addColorStop(1, `rgba(${primaryColor}, 0)`);

        ctx.save();
        ctx.beginPath();
        const baseConeW = 260 + activeVol * 40;
        const topConeW = 140 + activeVol * 25;
        ctx.moveTo(centerX - baseConeW, centerY);
        ctx.lineTo(centerX + baseConeW, centerY);
        ctx.lineTo(centerX + topConeW, centerY - coneHeight);
        ctx.lineTo(centerX - topConeW, centerY - coneHeight);
        ctx.closePath();
        ctx.fillStyle = coneGrad;
        ctx.fill();
        ctx.restore();

        // Vertical laser scan beams
        ctx.save();
        ctx.strokeStyle = `rgba(${primaryColor}, ${0.15 + activeVol * 0.25})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([12, 18]);
        for (let i = -3; i <= 3; i++) {
          const xOffset = i * 45;
          ctx.beginPath();
          ctx.moveTo(centerX + xOffset, centerY);
          ctx.lineTo(centerX + xOffset * 0.6, centerY - coneHeight);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ────────────────────────────────────────────────────────
      // 2. ISOMETRIC HOLOGRAPHIC PROJECTION PLATFORM (FLOOR SEAL)
      // ────────────────────────────────────────────────────────
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(1.0, isoY); // 3D Isometric floor plane

      // Background ambient energy glow disc
      const radialGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 280);
      radialGlow.addColorStop(0, `rgba(${primaryColor}, ${0.65 * baseAlpha * glow})`);
      radialGlow.addColorStop(0.35, `rgba(${secondaryColor}, ${0.35 * baseAlpha * glow})`);
      radialGlow.addColorStop(0.7, `rgba(${accentColor}, ${0.12 * baseAlpha * glow})`);
      radialGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radialGlow;
      ctx.beginPath();
      ctx.arc(0, 0, 280, 0, Math.PI * 2);
      ctx.fill();

      // Audio-reactive shockwave ripples expanding across platform
      for (let s = shockwaves.length - 1; s >= 0; s--) {
        const sw = shockwaves[s];
        sw.radius += sw.speed;
        sw.opacity -= 0.015;

        if (sw.opacity <= 0 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(s, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${primaryColor}, ${sw.opacity * baseAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // ────────────────────────────────────────────────────────
      // RING LAYER 1: OUTERMOST RETICLE & TICK MARKS
      // ────────────────────────────────────────────────────────
      const R_OUTER = 250 + activeVol * 15;
      ctx.save();
      ctx.rotate(rotOuterCW);

      // Outer boundary continuous fine circle
      ctx.beginPath();
      ctx.arc(0, 0, R_OUTER, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${primaryColor}, ${0.6 * baseAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Outer dashed track
      ctx.beginPath();
      ctx.arc(0, 0, R_OUTER - 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${secondaryColor}, ${0.45 * baseAlpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Outer radial tick markers & technical marks (64 sectors)
      const TICK_COUNT = 64;
      for (let i = 0; i < TICK_COUNT; i++) {
        const angle = (i * Math.PI * 2) / TICK_COUNT;
        const isMajor = i % 8 === 0;
        const isSemi = i % 4 === 0;
        const len = isMajor ? 14 : isSemi ? 8 : 4;
        const r1 = R_OUTER - 2;
        const r2 = R_OUTER + len;

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(cos * r1, sin * r1);
        ctx.lineTo(cos * r2, sin * r2);
        ctx.strokeStyle = isMajor
          ? `rgba(255, 255, 255, ${0.85 * baseAlpha})`
          : `rgba(${primaryColor}, ${0.45 * baseAlpha})`;
        ctx.lineWidth = isMajor ? 2.2 : 1;
        ctx.stroke();
      }

      // Outer rotating segmented brackets (4 cardinal brackets)
      for (let b = 0; b < 4; b++) {
        const bAngle = (b * Math.PI) / 2;
        ctx.save();
        ctx.rotate(bAngle);
        ctx.beginPath();
        ctx.arc(0, 0, R_OUTER + 8, -0.18, 0.18);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * baseAlpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Small corner nodes
        ctx.fillStyle = `rgba(${primaryColor}, 1)`;
        ctx.beginPath();
        ctx.arc(R_OUTER + 8, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore(); // end Ring Layer 1

      // ────────────────────────────────────────────────────────
      // RING LAYER 2: GLYPH RUNES & ARCANE-TECH CODE RING (CCW)
      // ────────────────────────────────────────────────────────
      const R_GLYPH = 215 + activeVol * 10;
      ctx.save();
      ctx.rotate(rotMiddleCCW);

      // Glyph track bounding borders
      ctx.beginPath();
      ctx.arc(0, 0, R_GLYPH + 14, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${primaryColor}, ${0.4 * baseAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, R_GLYPH - 14, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${primaryColor}, ${0.4 * baseAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Draw futuristic abstract tech glyphs around circumference
      const GLYPH_COUNT = 24;
      for (let g = 0; g < GLYPH_COUNT; g++) {
        const gAngle = (g * Math.PI * 2) / GLYPH_COUNT;
        ctx.save();
        ctx.rotate(gAngle);
        ctx.translate(R_GLYPH, 0);

        const glyphType = g % 6;
        ctx.strokeStyle = `rgba(224, 242, 254, ${0.85 * baseAlpha})`;
        ctx.fillStyle = `rgba(${primaryColor}, ${0.75 * baseAlpha})`;
        ctx.lineWidth = 1.5;

        // Custom sci-fi digital glyph patterns
        ctx.beginPath();
        if (glyphType === 0) {
          // Double chevron with dot
          ctx.moveTo(-5, -6);
          ctx.lineTo(0, 0);
          ctx.lineTo(-5, 6);
          ctx.moveTo(1, -6);
          ctx.lineTo(6, 0);
          ctx.lineTo(1, 6);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(8, 0, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (glyphType === 1) {
          // Segmented tech box with inner bar
          ctx.strokeRect(-6, -5, 12, 10);
          ctx.moveTo(0, -3);
          ctx.lineTo(0, 3);
          ctx.stroke();
        } else if (glyphType === 2) {
          // Triangular portal matrix
          ctx.moveTo(0, -6);
          ctx.lineTo(6, 4);
          ctx.lineTo(-6, 4);
          ctx.closePath();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (glyphType === 3) {
          // Cross-bracket data node
          ctx.moveTo(-6, 0);
          ctx.lineTo(6, 0);
          ctx.moveTo(0, -5);
          ctx.lineTo(0, 5);
          ctx.moveTo(-4, -4);
          ctx.lineTo(4, 4);
          ctx.stroke();
        } else if (glyphType === 4) {
          // Arcane circle with radial rays
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.moveTo(-7, 0);
          ctx.lineTo(-4, 0);
          ctx.moveTo(4, 0);
          ctx.lineTo(7, 0);
          ctx.stroke();
        } else {
          // Hex node with center dot
          ctx.moveTo(-5, -3);
          ctx.lineTo(0, -6);
          ctx.lineTo(5, -3);
          ctx.lineTo(5, 3);
          ctx.lineTo(0, 6);
          ctx.lineTo(-5, 3);
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore(); // end Ring Layer 2

      // ────────────────────────────────────────────────────────
      // RING LAYER 3: INTERWOVEN GEOMETRIC STAR & SQUARE MATRICES (CCW)
      // (Inspired by the intricate nested squares and 8-point stars in the reference)
      // ────────────────────────────────────────────────────────
      const R_GEO = 165 + activeVol * 8;
      ctx.save();
      ctx.rotate(rotGeometryCCW);

      // Outer circle bounding geometry
      ctx.beginPath();
      ctx.arc(0, 0, R_GEO, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${primaryColor}, ${0.5 * baseAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Interlocking Nested Squares (Forming an 8-Point Geometric Seal)
      const SQUARE_COUNT = 3;
      const squareSize = (R_GEO * 2) / Math.SQRT2;
      for (let sq = 0; sq < SQUARE_COUNT; sq++) {
        ctx.save();
        ctx.rotate((sq * Math.PI) / 6); // 0deg, 30deg, 60deg
        ctx.strokeStyle = `rgba(${secondaryColor}, ${0.55 * baseAlpha})`;
        ctx.lineWidth = 1.4;
        ctx.strokeRect(-squareSize / 2, -squareSize / 2, squareSize, squareSize);

        // Corner circles on each square vertex
        const halfS = squareSize / 2;
        const corners = [
          [-halfS, -halfS],
          [halfS, -halfS],
          [halfS, halfS],
          [-halfS, halfS],
        ];
        ctx.fillStyle = `rgba(${primaryColor}, ${0.8 * baseAlpha})`;
        for (const [cx, cy] of corners) {
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Inner 12-point star inscribed within geometry
      ctx.beginPath();
      for (let p = 0; p < 12; p++) {
        const pAngle = (p * Math.PI * 2) / 12;
        const pRadius = p % 2 === 0 ? R_GEO * 0.95 : R_GEO * 0.65;
        const px = Math.cos(pAngle) * pRadius;
        const py = Math.sin(pAngle) * pRadius;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(224, 242, 254, ${0.45 * baseAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore(); // end Ring Layer 3

      // ────────────────────────────────────────────────────────
      // RING LAYER 4: INNER DASHED ENERGY DISC & RADIAL SECTORS (CW)
      // ────────────────────────────────────────────────────────
      const R_INNER = 110 + activeVol * 6;
      ctx.save();
      ctx.rotate(rotInnerCW);

      // Inner track circles
      ctx.beginPath();
      ctx.arc(0, 0, R_INNER, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${primaryColor}, ${0.7 * baseAlpha})`;
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, R_INNER - 15, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${secondaryColor}, ${0.5 * baseAlpha})`;
      ctx.lineWidth = 1.0;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Radial energy spokes dividing into 12 sectors
      for (let s = 0; s < 12; s++) {
        const sAngle = (s * Math.PI * 2) / 12;
        const cos = Math.cos(sAngle);
        const sin = Math.sin(sAngle);
        ctx.beginPath();
        ctx.moveTo(cos * (R_INNER - 15), sin * (R_INNER - 15));
        ctx.lineTo(cos * (R_INNER + 5), sin * (R_INNER + 5));
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.65 * baseAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Small glowing nodes on inner boundary
      for (let n = 0; n < 6; n++) {
        const nAngle = (n * Math.PI * 2) / 6;
        ctx.fillStyle = `rgba(${primaryColor}, ${0.9 * baseAlpha})`;
        ctx.beginPath();
        ctx.arc(Math.cos(nAngle) * R_INNER, Math.sin(nAngle) * R_INNER, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore(); // end Ring Layer 4

      // ────────────────────────────────────────────────────────
      // RING LAYER 5: HIGH-ENERGY VORTEX CORE & PULSING EYE (CCW)
      // ────────────────────────────────────────────────────────
      const R_CORE = 60 + activeVol * 12 + Math.sin(pulsePhase * 2) * 4;
      ctx.save();
      ctx.rotate(rotCoreVortex);

      // Vortex spinning curved arcs
      const ARC_COUNT = 4;
      for (let a = 0; a < ARC_COUNT; a++) {
        const aAngle = (a * Math.PI * 2) / ARC_COUNT;
        ctx.save();
        ctx.rotate(aAngle);
        ctx.beginPath();
        ctx.arc(0, 0, R_CORE, 0, Math.PI * 0.38);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * baseAlpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, R_CORE - 12, 0, Math.PI * 0.38);
        ctx.strokeStyle = `rgba(${primaryColor}, ${0.75 * baseAlpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Innermost circular reticle
      ctx.beginPath();
      ctx.arc(0, 0, 32 + activeVol * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${primaryColor}, ${0.85 * baseAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore(); // end Ring Layer 5

      // ────────────────────────────────────────────────────────
      // EXACT CENTER: LUMINOUS ENERGY CORE & FLARE
      // ────────────────────────────────────────────────────────
      const corePulse = (0.7 + Math.sin(pulsePhase * 3) * 0.3 + activeVol * 1.5) * glow;
      const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 35 + activeVol * 15);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      coreGrad.addColorStop(0.25, `rgba(${primaryColor}, ${0.9 * corePulse})`);
      coreGrad.addColorStop(0.65, `rgba(${secondaryColor}, ${0.45 * corePulse})`);
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 35 + activeVol * 15, 0, Math.PI * 2);
      ctx.fill();

      // Center bright white core pip
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 4 + activeVol * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // end Isometric Floor Translation

      // ────────────────────────────────────────────────────────
      // 3. UPWARD RISING HOLOGRAPHIC PARTICLES (IN 3D BEAM SPACE)
      // ────────────────────────────────────────────────────────
      if (isConnected) {
        const particleSpeedMult = 1.0 + activeVol * 2.0;
        for (let i = 0; i < beamParticles.length; i++) {
          const p = beamParticles[i];
          p.y += p.speedY * particleSpeedMult;

          if (p.y > height * 0.75) {
            p.y = 0;
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 200;
            p.x = Math.cos(angle) * dist;
            p.z = Math.sin(angle) * dist;
          }

          // Screen position with isometric projection
          const screenX = centerX + p.x * (1 - p.y / (height * 1.2));
          const screenY = centerY - p.y + p.z * isoY * 0.5;

          const pAlpha = (1 - p.y / (height * 0.75)) * p.opacity * baseAlpha * glow;

          ctx.save();
          ctx.fillStyle = `hsla(${p.hue}, 95%, 75%, ${pAlpha})`;
          ctx.beginPath();
          ctx.arc(screenX, screenY, p.size * (1 - p.y / (height * 1.5)), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      style={{ filter: 'drop-shadow(0 0 25px rgba(6,182,212,0.45))' }}
    />
  );
};
