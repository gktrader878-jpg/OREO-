import React, { useEffect, useRef } from 'react';
import { AssistantState, EmotionState } from '../types';
import { AudioPlayer } from '../services/AudioPlayer';
import { AudioStreamer } from '../services/AudioStreamer';

interface AudioWaveformProps {
  state: AssistantState;
  audioStreamer: AudioStreamer;
  audioPlayer: AudioPlayer;
  userVolume: number;
  assistantVolume: number;
  emotion?: EmotionState;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  state,
  audioStreamer,
  audioPlayer,
  userVolume,
  assistantVolume,
  emotion = { current: 'neutral', intensity: 0, updatedAt: Date.now() },
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const barCount = 28;
    const freqArray = new Uint8Array(barCount);

    const render = () => {
      const width = (canvas.width = Math.min(canvas.parentElement?.clientWidth || 360, 480));
      const height = (canvas.height = 48);

      ctx.clearRect(0, 0, width, height);

      if (state === 'speaking') {
        audioPlayer.getByteFrequencyData(freqArray);
      } else if (state === 'listening') {
        audioStreamer.getByteFrequencyData(freqArray);
      } else {
        freqArray.fill(0);
      }

      let activeVol = state === 'speaking' ? assistantVolume : state === 'listening' ? userVolume : 0;
      const barWidth = 6;
      const gap = 8;
      const totalWidth = barCount * (barWidth + gap) - gap;
      const startX = (width - totalWidth) / 2;
      const centerY = height / 2;
      const now = performance.now() * 0.005;

      const isExcited = emotion.current === 'excited';
      const isCurious = emotion.current === 'curious';
      const isCalm = emotion.current === 'calm';

      for (let i = 0; i < barCount; i++) {
        const x = startX + i * (barWidth + gap);
        // Harmonic bell curve pattern
        const centerDist = Math.abs(i - barCount / 2) / (barCount / 2);
        const curveWeight = Math.cos(centerDist * Math.PI * 0.45);

        let barHeight = 6;
        if (state === 'thinking') {
          const waveSpeed = isExcited ? 1.5 : isCalm ? 0.7 : 1.0;
          const wave = Math.sin(now * waveSpeed + i * 0.35) * 0.5 + 0.5;
          barHeight = Math.max(6, (8 + wave * 18) * curveWeight);
        } else {
          const freq = freqArray[i % freqArray.length] || 0;
          const energyMultiplier = isExcited ? 1.25 : 1.0;
          const normalized = ((freq / 255) * 0.75 + activeVol * 0.55) * energyMultiplier;
          const baseHeight = 6;
          barHeight = Math.min(height - 4, Math.max(baseHeight, normalized * (height * 0.9) * curveWeight));
        }

        ctx.save();
        if (state === 'speaking') {
          if (isExcited) {
            ctx.fillStyle = '#ec4899';
            if (barHeight > 18) {
              ctx.shadowColor = 'rgba(236, 72, 153, 0.8)';
              ctx.shadowBlur = 14;
            }
          } else {
            ctx.fillStyle = '#a855f7';
            if (barHeight > 18) {
              ctx.shadowColor = 'rgba(168, 85, 247, 0.75)';
              ctx.shadowBlur = 12;
            }
          }
        } else if (state === 'thinking') {
          ctx.fillStyle = '#6366f1';
          if (barHeight > 12) {
            ctx.shadowColor = 'rgba(99, 102, 241, 0.8)';
            ctx.shadowBlur = 12;
          }
        } else if (state === 'listening') {
          if (isCurious) {
            ctx.fillStyle = '#06b6d4';
            if (barHeight > 18) {
              ctx.shadowColor = 'rgba(6, 182, 212, 0.85)';
              ctx.shadowBlur = 15;
            }
          } else {
            ctx.fillStyle = '#3b82f6';
            if (barHeight > 18) {
              ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
              ctx.shadowBlur = 15;
            }
          }
        } else {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        }

        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 3);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioPlayer, audioStreamer, userVolume, assistantVolume, emotion]);

  return (
    <div className="flex items-center justify-center h-12 w-full max-w-lg mx-auto pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-12" />
    </div>
  );
};
