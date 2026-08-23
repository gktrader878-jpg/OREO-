import { AssistantState, EmotionState, FunctionCall, ResponseSpeedMode, ServerMessage, SessionTelemetry, VoiceOption } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { AudioStreamer } from './AudioStreamer';
import { ToolManager } from './ToolManager';

export type SessionStateListener = (state: AssistantState) => void;
export type TelemetryListener = (telemetry: SessionTelemetry) => void;

export class LiveSession {
  private ws: WebSocket | null = null;
  private audioStreamer: AudioStreamer;
  private audioPlayer: AudioPlayer;
  private toolManager: ToolManager;

  private state: AssistantState = 'disconnected';
  private currentVoice: VoiceOption = 'Puck';
  private responseSpeedMode: ResponseSpeedMode = 'turbo';
  private errorMessage: string | null = null;

  private stateListeners: Set<SessionStateListener> = new Set();
  private telemetryListeners: Set<TelemetryListener> = new Set();

  private sessionStartTime: number = 0;
  private pingIntervalId: number | null = null;
  private sessionDurationIntervalId: number | null = null;
  private lastPingSentTime: number = 0;
  private currentLatencyMs: number = 0;
  private bytesSent: number = 0;
  private bytesReceived: number = 0;
  private userVolume: number = 0;
  private assistantVolume: number = 0;
  private thinkingTimeoutId: number | null = null;

  private emotionState: EmotionState = {
    current: 'neutral',
    intensity: 0.0,
    reason: 'Initial baseline',
    updatedAt: Date.now(),
  };

  constructor(toolManager: ToolManager) {
    this.toolManager = toolManager;

    this.audioPlayer = new AudioPlayer(
      (isSpeaking) => {
        if (isSpeaking) {
          this.clearThinkingTimeout();
          this.setState('speaking');
        } else if (this.state === 'speaking') {
          this.setState('listening');
        }
      },
      (volume) => {
        this.assistantVolume = volume;
        this.emitTelemetry();
      }
    );

    this.audioStreamer = new AudioStreamer(
      (base64Audio) => {
        this.sendAudioChunk(base64Audio);
      },
      (volume) => {
        this.userVolume = volume;
        this.emitTelemetry();
      },
      // onSpeechStart: user started speaking -> interrupt any playing audio & return to listening
      () => {
        this.clearThinkingTimeout();
        if (this.state === 'speaking' || this.state === 'thinking') {
          console.log('[LiveSession] User speech started: cutting AI audio & switching to listening');
          this.audioPlayer.stopAndClear();
          this.setState('listening');
        }
      },
      // onSpeechEnd: user paused/finished speech -> transition to thinking while checking for response
      () => {
        if (this.state === 'listening' && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.setState('thinking');
          // If no audio arrives within 4 seconds (model decides silence is appropriate), return cleanly to listening
          this.clearThinkingTimeout();
          this.thinkingTimeoutId = window.setTimeout(() => {
            if (this.state === 'thinking' && !this.audioPlayer.getIsPlaying()) {
              this.setState('listening');
            }
          }, 4000);
        }
      }
    );

    this.toolManager.setVoiceChangeHandler((voice) => {
      this.setVoice(voice);
    });

    this.toolManager.setEmotionChangeHandler((emotion) => {
      this.setEmotion(emotion);
    });
  }

  private clearThinkingTimeout() {
    if (this.thinkingTimeoutId) {
      clearTimeout(this.thinkingTimeoutId);
      this.thinkingTimeoutId = null;
    }
  }

  public subscribeState(listener: SessionStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    this.emitTelemetry();
    return () => this.telemetryListeners.delete(listener);
  }

  private setState(newState: AssistantState) {
    if (this.state !== newState) {
      this.state = newState;
      this.stateListeners.forEach((l) => l(this.state));
    }
  }

  public getState(): AssistantState {
    return this.state;
  }

  public getErrorMessage(): string | null {
    return this.errorMessage;
  }

  public getAudioStreamer(): AudioStreamer {
    return this.audioStreamer;
  }

  public getAudioPlayer(): AudioPlayer {
    return this.audioPlayer;
  }

  public async connect(selectedVoice?: VoiceOption): Promise<void> {
    if (this.state === 'connecting' || this.state === 'listening' || this.state === 'thinking' || this.state === 'speaking') {
      return;
    }

    if (selectedVoice) {
      this.currentVoice = selectedVoice;
    }

    this.errorMessage = null;
    this.setState('connecting');
    this.bytesSent = 0;
    this.bytesReceived = 0;
    this.sessionStartTime = Date.now();

    try {
      // 1. Initialize Audio contexts & microphone
      await this.audioPlayer.init();
      await this.audioStreamer.start();

      // 2. Establish WebSocket to backend live bridge
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live`;
      console.log(`[LiveSession] Connecting to WebSocket endpoint: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[LiveSession] WebSocket connected');
        this.setState('listening');
        this.startTelemetryLoops();

        if (this.currentVoice !== 'Puck') {
          this.setVoice(this.currentVoice);
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const rawData = event.data;
          this.bytesReceived += typeof rawData === 'string' ? rawData.length : rawData.byteLength || 0;

          const msg: ServerMessage = JSON.parse(rawData);

          if (msg.type === 'pong') {
            const now = Date.now();
            this.currentLatencyMs = Math.max(1, now - (msg.timestamp || this.lastPingSentTime));
            this.emitTelemetry();
            return;
          }

          if (msg.type === 'audio' && msg.data) {
            this.clearThinkingTimeout();
            if (this.state !== 'speaking') {
              this.setState('speaking');
            }
            await this.audioPlayer.queueAudioChunk(msg.data);
            return;
          }

          if (msg.type === 'interrupted') {
            console.log('[LiveSession] Interruption signal received: cutting AI playback immediately');
            this.clearThinkingTimeout();
            this.audioPlayer.stopAndClear();
            this.setState('listening');
            return;
          }

          if (msg.type === 'emotion_update' && msg.emotion) {
            this.setEmotion({
              current: msg.emotion,
              intensity: typeof msg.intensity === 'number' ? msg.intensity : 0.65,
              reason: msg.reason || 'Contextual shift',
              updatedAt: Date.now(),
            });
            return;
          }

          if (msg.type === 'turn_complete') {
            this.clearThinkingTimeout();
            if (this.state === 'thinking' && !this.audioPlayer.getIsPlaying()) {
              this.setState('listening');
            }
            return;
          }

          if (msg.type === 'tool_call' && msg.calls) {
            this.setState('thinking');
            this.handleToolCalls(msg.calls);
            return;
          }

          if (msg.type === 'error') {
            console.error('[LiveSession] Server reported error:', msg.message);
            this.clearThinkingTimeout();
            this.errorMessage = msg.message || 'Live session encountered an error';
            this.setState('error');
            return;
          }
        } catch (err) {
          console.error('[LiveSession] Error handling WebSocket message:', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[LiveSession] WebSocket closed code:', event.code, event.reason);
        if (this.state !== 'disconnected') {
          if (this.state !== 'error') {
            this.setState('disconnected');
          }
        }
        this.cleanup();
      };

      this.ws.onerror = (err) => {
        console.error('[LiveSession] WebSocket error:', err);
        this.errorMessage = 'Failed to connect to real-time voice server.';
        this.setState('error');
        this.cleanup();
      };
    } catch (err: any) {
      console.error('[LiveSession] Failed to connect:', err);
      const errMsg = (err?.message || '').toLowerCase();
      const errName = err?.name || '';

      let friendlyMsg = 'Failed to initialize microphone or live audio connection.';

      if (
        errName === 'NotAllowedError' ||
        errName === 'SecurityError' ||
        errMsg.includes('permission denied') ||
        errMsg.includes('permission') ||
        errMsg.includes('denied')
      ) {
        friendlyMsg =
          'Microphone access is blocked. Please allow microphone permissions in your browser or open the app in a new window.';
      } else if (errName === 'NotFoundError' || errMsg.includes('not found') || errMsg.includes('no microphone')) {
        friendlyMsg = 'No microphone device was detected. Please connect a microphone and try again.';
      } else if (errName === 'NotReadableError' || errMsg.includes('busy') || errMsg.includes('hardware')) {
        friendlyMsg = 'Microphone is currently in use by another application or process.';
      } else if (err?.message) {
        friendlyMsg = err.message;
      }

      this.errorMessage = friendlyMsg;
      this.setState('error');
      this.cleanup();
    }
  }

  private sendAudioChunk(base64Data: string) {
    if (
      this.ws &&
      this.ws.readyState === WebSocket.OPEN &&
      (this.state === 'listening' || this.state === 'thinking' || this.state === 'speaking')
    ) {
      const payload = JSON.stringify({
        type: 'audio',
        data: base64Data,
      });
      this.ws.send(payload);
      this.bytesSent += payload.length;
    }
  }

  private async handleToolCalls(calls: FunctionCall[]) {
    try {
      const responses = await this.toolManager.executeToolCalls(calls);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const payload = JSON.stringify({
          type: 'tool_response',
          responses,
        });
        this.ws.send(payload);
        this.bytesSent += payload.length;
      }
    } catch (err) {
      console.error('[LiveSession] Failed to execute tool calls:', err);
    }
  }

  public setVoice(voice: VoiceOption) {
    this.currentVoice = voice;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'set_voice',
          voice,
        })
      );
    }
    this.emitTelemetry();
  }

  public setEmotion(emotion: EmotionState) {
    this.emotionState = { ...emotion, updatedAt: Date.now() };
    this.emitTelemetry();
  }

  public setResponseSpeedMode(mode: ResponseSpeedMode) {
    this.responseSpeedMode = mode;
    this.audioStreamer.setSpeedMode(mode);
    this.emitTelemetry();
  }

  public getResponseSpeedMode(): ResponseSpeedMode {
    return this.responseSpeedMode;
  }

  public getEmotionState(): EmotionState {
    return this.emotionState;
  }

  public toggleMute(): boolean {
    const isMuted = !this.audioStreamer.getIsMuted();
    this.audioStreamer.setMute(isMuted);
    return isMuted;
  }

  public disconnect(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.setState('disconnected');
    this.cleanup();
  }

  private cleanup(): void {
    this.clearThinkingTimeout();
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    if (this.sessionDurationIntervalId) {
      clearInterval(this.sessionDurationIntervalId);
      this.sessionDurationIntervalId = null;
    }

    this.audioStreamer.stop();
    this.audioPlayer.stopAndClear();
  }

  private startTelemetryLoops(): void {
    // Ping loop every 3 seconds for latency measurement
    if (this.pingIntervalId) clearInterval(this.pingIntervalId);
    this.pingIntervalId = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingSentTime = Date.now();
        this.ws.send(
          JSON.stringify({
            type: 'ping',
            timestamp: this.lastPingSentTime,
          })
        );
      }
    }, 3000);

    // Duration and emotional decay loop every 1 second
    if (this.sessionDurationIntervalId) clearInterval(this.sessionDurationIntervalId);
    this.sessionDurationIntervalId = window.setInterval(() => {
      // Smoothly decay intense emotion toward neutral when inactive for >30s
      const now = Date.now();
      if (now - this.emotionState.updatedAt > 30000 && this.emotionState.intensity > 0.05) {
        this.emotionState.intensity = Math.max(0, this.emotionState.intensity - 0.02);
        if (this.emotionState.intensity <= 0.05) {
          this.emotionState.current = 'neutral';
          this.emotionState.intensity = 0.0;
        }
      }

      this.emitTelemetry();
    }, 1000);
  }

  private emitTelemetry(): void {
    const sessionDuration = this.sessionStartTime > 0 ? Math.floor((Date.now() - this.sessionStartTime) / 1000) : 0;

    const telemetry: SessionTelemetry = {
      latencyMs: this.currentLatencyMs,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      sessionDuration,
      userVolume: this.userVolume,
      assistantVolume: this.assistantVolume,
      currentVoice: this.currentVoice,
      emotion: this.emotionState,
      responseSpeedMode: this.responseSpeedMode,
    };

    this.telemetryListeners.forEach((l) => l(telemetry));
  }

  public destroy(): void {
    this.disconnect();
    this.audioPlayer.destroy();
    this.stateListeners.clear();
    this.telemetryListeners.clear();
  }
}
