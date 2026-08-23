/**
 * AudioPlayer handles playback of 24kHz PCM16 audio chunks streamed from Gemini Live API.
 * Features gapless playback scheduling, instant interruption handling, and output frequency analysis.
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSourceNodes: Set<AudioBufferSourceNode> = new Set();
  private isPlaying: boolean = false;
  private onSpeakingStateChange: ((isSpeaking: boolean) => void) | null = null;
  private onVolumeChange: ((volume: number) => void) | null = null;
  private volumeIntervalId: number | null = null;
  private activeChunkCount: number = 0;

  constructor(
    onSpeakingStateChange?: (isSpeaking: boolean) => void,
    onVolumeChange?: (volume: number) => void
  ) {
    if (onSpeakingStateChange) this.onSpeakingStateChange = onSpeakingStateChange;
    if (onVolumeChange) this.onVolumeChange = onVolumeChange;
  }

  public setCallbacks(
    onSpeakingStateChange: (isSpeaking: boolean) => void,
    onVolumeChange?: (volume: number) => void
  ) {
    this.onSpeakingStateChange = onSpeakingStateChange;
    if (onVolumeChange) this.onVolumeChange = onVolumeChange;
  }

  public async init(): Promise<void> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      // Output sample rate for Gemini Live audio is 24000Hz
      this.audioContext = new AudioCtx({ sampleRate: 24000 });
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.3;

      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);

      this.startVolumeMonitoring();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Queue and schedule base64 PCM 24kHz audio chunk for gapless playback
   */
  public async queueAudioChunk(base64Pcm: string): Promise<void> {
    await this.init();
    if (!this.audioContext || !this.gainNode) return;

    try {
      const audioBuffer = this.base64PcmToAudioBuffer(base64Pcm, 24000);
      if (!audioBuffer) return;

      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.gainNode);

      const currentTime = this.audioContext.currentTime;
      // If nextStartTime is in the past, reset to currentTime + ultra-tight jitter buffer (5ms for instantaneous response)
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.005;
      }

      const scheduledStart = this.nextStartTime;
      sourceNode.start(scheduledStart);
      this.nextStartTime += audioBuffer.duration;

      this.activeSourceNodes.add(sourceNode);
      this.activeChunkCount++;

      if (!this.isPlaying) {
        this.isPlaying = true;
        if (this.onSpeakingStateChange) {
          this.onSpeakingStateChange(true);
        }
      }

      sourceNode.onended = () => {
        this.activeSourceNodes.delete(sourceNode);
        this.activeChunkCount--;

        if (this.activeChunkCount <= 0 && this.activeSourceNodes.size === 0) {
          this.isPlaying = false;
          if (this.onSpeakingStateChange) {
            this.onSpeakingStateChange(false);
          }
        }
      };
    } catch (err) {
      console.error('[AudioPlayer] Error processing audio chunk:', err);
    }
  }

  /**
   * Immediate interruption: Stops all playing sources and resets the scheduled time.
   */
  public stopAndClear(): void {
    console.log('[AudioPlayer] Interruption signal received: stopping all active playback');

    this.activeSourceNodes.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {
        // Node might have already finished
      }
    });

    this.activeSourceNodes.clear();
    this.activeChunkCount = 0;
    this.isPlaying = false;

    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    }

    if (this.onSpeakingStateChange) {
      this.onSpeakingStateChange(false);
    }

    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  public getByteFrequencyData(targetArray: Uint8Array): void {
    if (this.analyserNode && this.isPlaying) {
      this.analyserNode.getByteFrequencyData(targetArray);
    } else {
      targetArray.fill(0);
    }
  }

  private startVolumeMonitoring(): void {
    if (this.volumeIntervalId) clearInterval(this.volumeIntervalId);

    const dataArray = new Uint8Array(this.analyserNode?.frequencyBinCount || 128);

    this.volumeIntervalId = window.setInterval(() => {
      if (!this.analyserNode || !this.isPlaying) {
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

  /**
   * Decodes Base64 16-bit PCM Little Endian to Web Audio AudioBuffer
   */
  private base64PcmToAudioBuffer(base64: string, sampleRate: number = 24000): AudioBuffer | null {
    try {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);

      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      if (!this.audioContext) return null;

      const audioBuffer = this.audioContext.createBuffer(1, float32.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32);
      return audioBuffer;
    } catch (err) {
      console.error('[AudioPlayer] Failed to decode PCM base64:', err);
      return null;
    }
  }

  public setVolume(volume: number): void {
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(
        Math.max(0, Math.min(1, volume)),
        this.audioContext.currentTime
      );
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public destroy(): void {
    this.stopAndClear();
    if (this.volumeIntervalId) {
      clearInterval(this.volumeIntervalId);
      this.volumeIntervalId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
