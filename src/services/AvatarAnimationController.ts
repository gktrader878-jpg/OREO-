import { AssistantState, EmotionState, EmotionType } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { AudioStreamer } from './AudioStreamer';

export interface AvatarMetrics {
  // Audio reactive values
  outputAmplitude: number; // 0 to 1
  inputAmplitude: number;  // 0 to 1
  frequencyBands: {
    bass: number;    // 0 to 1 (jaw drop / mouth openness)
    mid: number;     // 0 to 1 (lip width / vowel spread)
    treble: number;  // 0 to 1 (expressive mouth height)
  };
  isSpeaking: boolean;
  isListening: boolean;

  // Head & Body kinetics
  headTilt: number;     // degrees (-10 to 10)
  headTurn: number;     // degrees (-15 to 15)
  headNod: number;      // degrees (-8 to 8)
  breathingOffset: number; // 0 to 1 (smooth sinusoidal)
  bodyLeanX: number;    // px (-20 to 20)
  bodyLeanY: number;    // px (-15 to 15)

  // Facial Rigging
  eyeOpenness: number;  // 0 (closed/blink) to 1 (fully open)
  eyeGazeX: number;     // -1 (left) to 1 (right)
  eyeGazeY: number;     // -1 (up) to 1 (down)
  eyebrowLeft: number;  // -1 (furrowed/down) to 1 (raised)
  eyebrowRight: number; // -1 (furrowed/down) to 1 (raised)
  mouthOpen: number;    // 0 (closed) to 1 (wide open)
  mouthWidth: number;   // 0.8 (pucker) to 1.3 (wide smile/vowel)
  mouthSmile: number;   // -0.5 (frown) to 1 (broad smile)

  // Hologram intensity
  hologramAlpha: number;  // 0 to 1
  glowIntensity: number;  // 0 to 1
  scanlineSpeed: number;  // multiplier
  particleActivity: number; // multiplier
}

export class AvatarAnimationController {
  private freqBuffer = new Uint8Array(64);
  private lastBlinkTime = 0;
  private nextBlinkInterval = 3500;
  private isBlinking = false;
  private blinkProgress = 0;

  private breathingPhase = 0;
  private speechNodPhase = 0;
  private thinkingGazePhase = 0;

  // Smoothed target values for fluid organic animation
  private smoothedMouthOpen = 0;
  private smoothedMouthWidth = 1.0;
  private smoothedHeadTilt = 0;
  private smoothedHeadTurn = 0;
  private smoothedHeadNod = 0;
  private smoothedGazeX = 0;
  private smoothedGazeY = 0;
  private smoothedEyebrowL = 0;
  private smoothedEyebrowR = 0;
  private smoothedSmile = 0.2;

  // Random micro-saccades for organic lifelike eyes
  private saccadeTimer = 0;
  private saccadeTargetX = 0;
  private saccadeTargetY = 0;

  public update(
    deltaMs: number,
    state: AssistantState,
    audioPlayer: AudioPlayer,
    audioStreamer: AudioStreamer,
    emotion: EmotionState,
    mouseParallax: { x: number; y: number }
  ): AvatarMetrics {
    const deltaSec = deltaMs / 1000;
    const now = performance.now();

    // 1. Audio Analysis
    let outputAmp = 0;
    let inputAmp = 0;
    let bass = 0;
    let mid = 0;
    let treble = 0;

    const isSpeaking = state === 'speaking' && audioPlayer.getIsPlaying();
    const isListening = state === 'listening';

    if (isSpeaking) {
      audioPlayer.getByteFrequencyData(this.freqBuffer);
      let sum = 0;
      let bassSum = 0;
      let midSum = 0;
      let trebleSum = 0;

      // Split 64 frequency bins into 3 functional speech bands
      for (let i = 0; i < 8; i++) bassSum += this.freqBuffer[i];
      for (let i = 8; i < 28; i++) midSum += this.freqBuffer[i];
      for (let i = 28; i < 64; i++) trebleSum += this.freqBuffer[i];
      for (let i = 0; i < 64; i++) sum += this.freqBuffer[i];

      outputAmp = Math.min(1, (sum / 64) / 120);
      bass = Math.min(1, (bassSum / 8) / 130);
      mid = Math.min(1, (midSum / 20) / 120);
      treble = Math.min(1, (trebleSum / 36) / 110);
    } else if (isListening) {
      audioStreamer.getByteFrequencyData(this.freqBuffer);
      let sum = 0;
      for (let i = 0; i < 32; i++) sum += this.freqBuffer[i];
      inputAmp = Math.min(1, (sum / 32) / 100);
    }

    // 2. Breathing Cycle (continuous smooth sinusoidal movement)
    let breathingSpeed = 1.6; // rad/s
    if (state === 'thinking') breathingSpeed = 2.0;
    if (state === 'speaking') breathingSpeed = 2.4;
    if (emotion.current === 'excited') breathingSpeed = 3.0;
    if (emotion.current === 'calm') breathingSpeed = 1.2;

    this.breathingPhase += deltaSec * breathingSpeed;
    const breathingOffset = (Math.sin(this.breathingPhase) + 1) * 0.5;

    // 3. Natural Organic Blinking System
    if (!this.isBlinking && now - this.lastBlinkTime > this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkProgress = 0;
      this.lastBlinkTime = now;
      // Randomized natural blink intervals between 2.5s and 5.5s
      this.nextBlinkInterval = 2500 + Math.random() * 3000;
    }

    let eyeOpenness = 1.0;
    if (this.isBlinking) {
      this.blinkProgress += deltaMs / 140; // 140ms full blink duration
      if (this.blinkProgress >= 1.0) {
        this.isBlinking = false;
        eyeOpenness = 1.0;
      } else {
        // Natural ease in-out blink curve
        eyeOpenness = Math.abs(Math.sin(this.blinkProgress * Math.PI - Math.PI / 2));
      }
    }

    // State-based eye modifications
    if (state === 'disconnected') {
      eyeOpenness = 0.15; // sleepy/inactive
    } else if (state === 'thinking') {
      eyeOpenness = Math.min(eyeOpenness, 0.85); // thoughtful narrowed gaze
    }

    // 4. Micro-Saccades (realistic eye tracking & occasional drift)
    this.saccadeTimer += deltaMs;
    if (this.saccadeTimer > 2000 + Math.random() * 2500) {
      this.saccadeTimer = 0;
      if (state === 'thinking') {
        // Look up & slightly to side when thinking
        this.saccadeTargetX = (Math.random() - 0.5) * 0.4;
        this.saccadeTargetY = -0.5 - Math.random() * 0.3;
      } else if (state === 'listening') {
        // Focus directly forward with tiny micro-adjustments
        this.saccadeTargetX = (Math.random() - 0.5) * 0.15;
        this.saccadeTargetY = (Math.random() - 0.5) * 0.1;
      } else {
        this.saccadeTargetX = (Math.random() - 0.5) * 0.35;
        this.saccadeTargetY = (Math.random() - 0.5) * 0.25;
      }
    }

    // Blend mouse parallax into gaze
    const targetGazeX = this.saccadeTargetX + mouseParallax.x * 0.6;
    const targetGazeY = this.saccadeTargetY + mouseParallax.y * 0.5;
    this.smoothedGazeX += (targetGazeX - this.smoothedGazeX) * 0.12;
    this.smoothedGazeY += (targetGazeY - this.smoothedGazeY) * 0.12;

    // 5. Lip Sync & Mouth Shape Controller
    let targetMouthOpen = 0;
    let targetMouthWidth = 1.0;
    let targetSmile = 0.15; // gentle default anime smile

    // Apply Emotion to Baseline Facial Expressions
    let targetEyebrowL = 0;
    let targetEyebrowR = 0;
    let targetHeadTilt = 0;

    switch (emotion.current) {
      case 'happy':
      case 'amused':
        targetSmile = 0.65;
        targetEyebrowL = 0.25;
        targetEyebrowR = 0.25;
        targetHeadTilt = 2.5;
        break;
      case 'excited':
        targetSmile = 0.85;
        targetEyebrowL = 0.5;
        targetEyebrowR = 0.5;
        targetHeadTilt = 3.5;
        break;
      case 'curious':
        targetSmile = 0.2;
        targetEyebrowL = 0.6;  // one eyebrow raised inquisitively
        targetEyebrowR = -0.1;
        targetHeadTilt = -4.5;
        break;
      case 'concerned':
      case 'empathetic':
        targetSmile = -0.2;
        targetEyebrowL = -0.4;
        targetEyebrowR = -0.4;
        targetHeadTilt = -2.0;
        break;
      case 'serious':
        targetSmile = -0.1;
        targetEyebrowL = -0.3;
        targetEyebrowR = -0.3;
        targetHeadTilt = 0;
        break;
      case 'surprised':
        targetSmile = 0.3;
        targetEyebrowL = 0.8;
        targetEyebrowR = 0.8;
        targetHeadTilt = 1.0;
        break;
      case 'thoughtful':
        targetSmile = 0.1;
        targetEyebrowL = 0.2;
        targetEyebrowR = -0.2;
        targetHeadTilt = 3.0;
        break;
      case 'calm':
      case 'confident':
      default:
        targetSmile = 0.25;
        targetEyebrowL = 0.05;
        targetEyebrowR = 0.05;
        targetHeadTilt = 0;
        break;
    }

    // Dynamic Real-time Audio Lip Sync Calculation
    if (isSpeaking) {
      // Mouth vertical opening correlates with bass energy and overall speech amplitude
      const rawAperture = Math.pow(outputAmp, 0.8) * 0.7 + bass * 0.3;
      targetMouthOpen = Math.min(1.0, Math.max(0, rawAperture * 1.3));

      // Mouth horizontal width / vowel shape modulates with mid-frequency formant energy
      targetMouthWidth = 0.85 + mid * 0.45;

      // Dynamic cadence nod while speaking
      this.speechNodPhase += deltaSec * (8 + outputAmp * 6);
      const nodAmount = Math.sin(this.speechNodPhase) * (outputAmp * 4.5);
      this.smoothedHeadNod += (nodAmount - this.smoothedHeadNod) * 0.2;
    } else {
      targetMouthOpen = 0;
      targetMouthWidth = 1.0;
      this.smoothedHeadNod += (0 - this.smoothedHeadNod) * 0.1;
    }

    // State Modifiers for Head & Body
    if (state === 'thinking') {
      this.thinkingGazePhase += deltaSec * 1.5;
      targetHeadTilt = (Math.sin(this.thinkingGazePhase) > 0 ? 3.5 : -3.5);
      targetEyebrowL = 0.3;
      targetEyebrowR = -0.15;
    } else if (state === 'listening') {
      targetHeadTilt = -1.5; // attentive forward orientation
      targetEyebrowL = 0.2;
      targetEyebrowR = 0.2;
    }

    // Smooth interpolations (no twitching)
    const mouthLerpSpeed = isSpeaking ? 0.35 : 0.2;
    this.smoothedMouthOpen += (targetMouthOpen - this.smoothedMouthOpen) * mouthLerpSpeed;
    this.smoothedMouthWidth += (targetMouthWidth - this.smoothedMouthWidth) * 0.25;
    this.smoothedSmile += (targetSmile - this.smoothedSmile) * 0.1;
    this.smoothedEyebrowL += (targetEyebrowL - this.smoothedEyebrowL) * 0.15;
    this.smoothedEyebrowR += (targetEyebrowR - this.smoothedEyebrowR) * 0.15;

    // Head kinetics blending parallax + state
    const targetTurn = mouseParallax.x * 6;
    const targetLeanX = mouseParallax.x * 12;
    const targetLeanY = mouseParallax.y * 8 + (state === 'listening' ? -4 : 0);

    this.smoothedHeadTilt += (targetHeadTilt - this.smoothedHeadTilt) * 0.08;
    this.smoothedHeadTurn += (targetTurn - this.smoothedHeadTurn) * 0.1;

    // Hologram Projection Parameters
    let hologramAlpha = 0.95;
    let glowIntensity = 0.7;
    let scanlineSpeed = 1.0;
    let particleActivity = 1.0;

    if (state === 'disconnected') {
      hologramAlpha = 0.45;
      glowIntensity = 0.2;
      scanlineSpeed = 0.4;
      particleActivity = 0.3;
    } else if (state === 'connecting') {
      hologramAlpha = 0.75 + Math.sin(now * 0.01) * 0.2;
      glowIntensity = 0.9;
      scanlineSpeed = 2.5;
      particleActivity = 2.0;
    } else if (state === 'listening') {
      hologramAlpha = 0.98;
      glowIntensity = 0.8 + inputAmp * 0.4;
      scanlineSpeed = 1.2;
      particleActivity = 1.2 + inputAmp * 1.5;
    } else if (state === 'thinking') {
      hologramAlpha = 0.92;
      glowIntensity = 0.85 + Math.sin(now * 0.006) * 0.25;
      scanlineSpeed = 1.8;
      particleActivity = 2.2;
    } else if (state === 'speaking') {
      hologramAlpha = 1.0;
      glowIntensity = 0.85 + outputAmp * 0.5;
      scanlineSpeed = 1.4 + outputAmp * 1.2;
      particleActivity = 1.5 + outputAmp * 2.0;
    }

    return {
      outputAmplitude: outputAmp,
      inputAmplitude: inputAmp,
      frequencyBands: { bass, mid, treble },
      isSpeaking,
      isListening,
      headTilt: this.smoothedHeadTilt,
      headTurn: this.smoothedHeadTurn,
      headNod: this.smoothedHeadNod,
      breathingOffset,
      bodyLeanX: targetLeanX,
      bodyLeanY: targetLeanY,
      eyeOpenness,
      eyeGazeX: this.smoothedGazeX,
      eyeGazeY: this.smoothedGazeY,
      eyebrowLeft: this.smoothedEyebrowL,
      eyebrowRight: this.smoothedEyebrowR,
      mouthOpen: this.smoothedMouthOpen,
      mouthWidth: this.smoothedMouthWidth,
      mouthSmile: this.smoothedSmile,
      hologramAlpha,
      glowIntensity,
      scanlineSpeed,
      particleActivity,
    };
  }
}
