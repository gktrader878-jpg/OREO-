import { ResponseSpeedMode } from '../types';

/**
 * AudioStreamer handles microphone capture, PCM16 conversion,
 * downsampling to 16kHz, real-time volume analysis, Voice Activity Detection (VAD),
 * intelligent noise gating, and speech state callbacks.
 */

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isMuted: boolean = false;
  private isStreaming: boolean = false;

  private onAudioChunk: ((base64Pcm: string) => void) | null = null;
  private onVolumeChange: ((volume: number) => void) | null = null;
  private onSpeechStart: (() => void) | null = null;
  private onSpeechEnd: (() => void) | null = null;

  private volumeIntervalId: number | null = null;

  // Voice Activity Detection & Noise Gate state
  private isUserSpeaking: boolean = false;
  private lastSpeechTimestamp: number = 0;
  private noiseFloor: number = 0.012; // Ambient noise floor baseline
  private responseSpeedMode: ResponseSpeedMode = 'turbo'; // 'turbo' (ultra-fast) or 'balanced'
  private speechHangoverMs: number = 320; // Turn turnaround threshold
  private speechThresholdOffset: number = 0.016; // Instant onset detection

  constructor(
    onAudioChunk?: (base64Pcm: string) => void,
    onVolumeChange?: (volume: number) => void,
    onSpeechStart?: () => void,
    onSpeechEnd?: () => void
  ) {
    if (onAudioChunk) this.onAudioChunk = onAudioChunk;
    if (onVolumeChange) this.onVolumeChange = onVolumeChange;
    if (onSpeechStart) this.onSpeechStart = onSpeechStart;
    if (onSpeechEnd) this.onSpeechEnd = onSpeechEnd;
    this.applySpeedMode('turbo');
  }

  public setSpeedMode(mode: ResponseSpeedMode) {
    this.responseSpeedMode = mode;
    this.applySpeedMode(mode);
  }

  public getSpeedMode(): ResponseSpeedMode {
    return this.responseSpeedMode;
  }

  private applySpeedMode(mode: ResponseSpeedMode) {
    if (mode === 'turbo') {
      this.speechHangoverMs = 320; // Instant turn turnaround (~320ms pause triggers turn)
      this.speechThresholdOffset = 0.015;
    } else {
      this.speechHangoverMs = 550; // Balanced mode
      this.speechThresholdOffset = 0.022;
    }
  }

  public setCallbacks(
    onAudioChunk: (base64Pcm: string) => void,
    onVolumeChange?: (volume: number) => void,
    onSpeechStart?: () => void,
    onSpeechEnd?: () => void
  ) {
    this.onAudioChunk = onAudioChunk;
    if (onVolumeChange) this.onVolumeChange = onVolumeChange;
    if (onSpeechStart) this.onSpeechStart = onSpeechStart;
    if (onSpeechEnd) this.onSpeechEnd = onSpeechEnd;
  }

  public async checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
      return 'unsupported';
    }
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as any });
      return permissionStatus.state;
    } catch {
      return 'unsupported';
    }
  }

  public async start(): Promise<void> {
    if (this.isStreaming) return;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = new Error('Microphone access is not supported by your browser or environment.');
      err.name = 'NotSupportedError';
      throw err;
    }

    try {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (constraintErr: any) {
        if (
          constraintErr?.name === 'OverconstrainedError' ||
          constraintErr?.name === 'TypeError'
        ) {
          console.warn('[AudioStreamer] Advanced audio constraints rejected, falling back to basic audio request');
          this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw constraintErr;
        }
      }

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // AnalyserNode for frequency calculation and volume
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.4;
      this.sourceNode.connect(this.analyserNode);

      // ScriptProcessor for 1024 samples (~64ms chunks at 16kHz)
      this.processorNode = this.audioContext.createScriptProcessor(1024, 1, 1);

      this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isStreaming || this.isMuted) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // 1. Calculate Root Mean Square (RMS) energy of current block for VAD & visualizer
        let sumSquares = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sumSquares += inputChannelData[i] * inputChannelData[i];
        }
        const rms = Math.sqrt(sumSquares / inputChannelData.length);

        // 2. Adapt ambient noise floor baseline
        if (rms < this.noiseFloor * 1.5) {
          this.noiseFloor = this.noiseFloor * 0.95 + rms * 0.05;
        }

        const speechThreshold = Math.max(0.012, this.noiseFloor + this.speechThresholdOffset);
        const hasSpeechEnergy = rms > speechThreshold;
        const now = Date.now();

        // 3. Convert sample to PCM16 Base64 (16kHz mono Little Endian)
        const pcm16Base64 = this.float32ToPcm16Base64(
          inputChannelData,
          this.audioContext?.sampleRate || 16000,
          16000
        );

        if (!pcm16Base64) return;

        // 4. Emit audio chunk to Gemini Live API
        if (this.onAudioChunk) {
          this.onAudioChunk(pcm16Base64);
        }

        // 5. Track speech onset and endings for UI state & instant AI interruption
        if (hasSpeechEnergy) {
          this.lastSpeechTimestamp = now;

          if (!this.isUserSpeaking) {
            this.isUserSpeaking = true;
            if (this.onSpeechStart) {
              this.onSpeechStart();
            }
          }
        } else if (this.isUserSpeaking) {
          const timeSinceSpeech = now - this.lastSpeechTimestamp;
          if (timeSinceSpeech >= this.speechHangoverMs) {
            this.isUserSpeaking = false;
            if (this.onSpeechEnd) {
              this.onSpeechEnd();
            }
          }
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isStreaming = true;
      this.startVolumeMonitoring();
    } catch (err: any) {
      this.stop();
      const errName = err?.name || '';
      const errMsg = (err?.message || '').toLowerCase();

      if (
        errName === 'NotAllowedError' ||
        errName === 'SecurityError' ||
        errMsg.includes('permission denied') ||
        errMsg.includes('permission')
      ) {
        const customErr = new Error('Microphone permission was denied. Please allow microphone access in your browser to speak with OREO.');
        customErr.name = 'NotAllowedError';
        throw customErr;
      } else if (errName === 'NotFoundError' || errMsg.includes('not found')) {
        const customErr = new Error('No microphone device was found on this system.');
        customErr.name = 'NotFoundError';
        throw customErr;
      } else if (errName === 'NotReadableError' || errMsg.includes('hardware')) {
        const customErr = new Error('Microphone is busy or locked by another application.');
        customErr.name = 'NotReadableError';
        throw customErr;
      }
      throw err;
    }
  }

  private startVolumeMonitoring() {
    if (this.volumeIntervalId) clearInterval(this.volumeIntervalId);

    const dataArray = new Uint8Array(this.analyserNode?.frequencyBinCount || 128);

    this.volumeIntervalId = window.setInterval(() => {
      if (!this.analyserNode || !this.isStreaming || this.isMuted) {
        if (this.onVolumeChange) this.onVolumeChange(0);
        return;
      }

      this.analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const normalized = Math.min(1, average / 128);

      if (this.onVolumeChange) {
        this.onVolumeChange(normalized);
      }
    }, 40);
  }

  public getByteFrequencyData(targetArray: Uint8Array): void {
    if (this.analyserNode && this.isStreaming && !this.isMuted) {
      this.analyserNode.getByteFrequencyData(targetArray);
    } else {
      targetArray.fill(0);
    }
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsStreaming(): boolean {
    return this.isStreaming;
  }

  public getIsUserSpeaking(): boolean {
    return this.isUserSpeaking;
  }

  public stop(): void {
    this.isStreaming = false;
    this.isUserSpeaking = false;

    if (this.volumeIntervalId) {
      clearInterval(this.volumeIntervalId);
      this.volumeIntervalId = null;
    }

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  /**
   * Resamples and converts Float32 audio samples to 16-bit PCM Little Endian base64 string.
   */
  private float32ToPcm16Base64(
    input: Float32Array,
    inputSampleRate: number,
    targetSampleRate: number = 16000
  ): string {
    let samples = input;

    if (inputSampleRate !== targetSampleRate) {
      const ratio = targetSampleRate / inputSampleRate;
      const targetLength = Math.round(input.length * ratio);
      const resampled = new Float32Array(targetLength);
      for (let i = 0; i < targetLength; i++) {
        const originIndex = i / ratio;
        const indexLow = Math.floor(originIndex);
        const indexHigh = Math.min(indexLow + 1, input.length - 1);
        const weight = originIndex - indexLow;
        resampled[i] = input[indexLow] * (1 - weight) + input[indexHigh] * weight;
      }
      samples = resampled;
    }

    const buffer = new ArrayBuffer(samples.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      const pcm16 = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(i * 2, pcm16, true);
    }

    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, chunk as any);
    }

    return btoa(binary);
  }
}
