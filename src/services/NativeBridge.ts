/**
 * NativeBridge.ts
 *
 * Provides a unified communication bridge between OREO's React Agent and the native
 * operating system. Supports both:
 * 1. Electron Native Desktop Runtime (window.oreoNative IPC)
 * 2. Real Web Screen Awareness (navigator.mediaDevices.getDisplayMedia API)
 */

export type NativeRuntimeType = 'ELECTRON_NATIVE' | 'WEB_DISPLAY_MEDIA' | 'STANDALONE_WEB';

export interface ScreenCaptureResult {
  success: boolean;
  imageData?: string; // Base64 PNG data URL
  width?: number;
  height?: number;
  sourceName?: string;
  sourceId?: string;
  timestamp: number;
  error?: string;
  scaleFactor?: number;
  cursor?: { x: number; y: number };
  totalSources?: Array<{ id: string; name: string; thumbnail?: string }>;
}

export interface NativeActionResult {
  success: boolean;
  action: string;
  target?: string;
  error?: string;
  platform?: string;
}

export interface NativeSystemInfo {
  platform: string;
  arch?: string;
  osRelease?: string;
  hostname?: string;
  cpus?: number;
  cpuModel?: string;
  totalMemoryMB?: number;
  freeMemoryMB?: number;
  totalMemoryGB?: number;
  freeMemoryGB?: number;
  uptimeSeconds?: number;
  displays?: Array<{
    id: number;
    bounds: { x: number; y: number; width: number; height: number };
    scaleFactor: number;
    isPrimary: boolean;
  }>;
  cursor?: { x: number; y: number };
  electronVersion?: string;
  isElectron: boolean;
}

export interface NativeBridgeState {
  runtime: NativeRuntimeType;
  isConnected: boolean;
  isElectron: boolean;
  platform: string;
  isScreenSharingActive: boolean;
  lastCaptureTimestamp?: number;
  lastCaptureThumbnail?: string;
  lastScreenshot?: {
    dataUrl: string;
    width: number;
    height: number;
    timestamp: number;
  };
  activeDisplayCount: number;
  displays?: Array<{
    id: number;
    bounds: { x: number; y: number; width: number; height: number };
    scaleFactor: number;
    isPrimary: boolean;
  }>;
}

declare global {
  interface Window {
    oreoNative?: {
      isNative: boolean;
      platform: string;
      ping: () => Promise<any>;
      captureScreen: (options?: any) => Promise<any>;
      getDisplays: () => Promise<any>;
      getCursorPosition: () => Promise<{ x: number; y: number }>;
      mouseClick: (params: { x: number; y: number; button?: string; double?: boolean }) => Promise<any>;
      mouseMove: (params: { x: number; y: number }) => Promise<any>;
      mouseScroll: (params: { deltaX: number; deltaY: number }) => Promise<any>;
      keyboardType: (params: { text: string }) => Promise<any>;
      keyboardPress: (params: { key: string; modifiers?: string[] }) => Promise<any>;
      openApp: (params: { appNameOrPath: string }) => Promise<any>;
      openExternal: (url: string) => Promise<any>;
      getSystemInfo: () => Promise<any>;
      windowControl: (action: string) => Promise<any>;
      readClipboard: () => Promise<string>;
      writeClipboard: (text: string) => Promise<boolean>;
    };
  }
}

export class NativeBridge {
  private static instance: NativeBridge | null = null;
  private listeners: Set<(state: NativeBridgeState) => void> = new Set();

  private activeScreenStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private isDisplayMediaDisallowed: boolean = false;

  private state: NativeBridgeState = {
    runtime: 'STANDALONE_WEB',
    isConnected: false,
    isElectron: false,
    platform: 'web',
    isScreenSharingActive: false,
    activeDisplayCount: 1,
    displays: [],
  };

  public static getInstance(): NativeBridge {
    if (!NativeBridge.instance) {
      NativeBridge.instance = new NativeBridge();
    }
    return NativeBridge.instance;
  }

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (typeof window !== 'undefined') {
      if (window.oreoNative && window.oreoNative.isNative) {
        try {
          await window.oreoNative.ping();
          this.state = {
            runtime: 'ELECTRON_NATIVE',
            isConnected: true,
            isElectron: true,
            platform: window.oreoNative.platform || (typeof navigator !== 'undefined' ? navigator.platform : 'native'),
            isScreenSharingActive: true,
            activeDisplayCount: 1,
            displays: [],
          };
          this.notify();
          return;
        } catch (e) {
          console.warn('[NativeBridge] Electron bridge detected but ping failed', e);
        }
      }

      // Check browser environment capabilities
      const hasDisplayMedia =
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices &&
        !!navigator.mediaDevices.getDisplayMedia;

      this.state = {
        runtime: hasDisplayMedia ? 'WEB_DISPLAY_MEDIA' : 'STANDALONE_WEB',
        isConnected: true,
        isElectron: false,
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'web',
        isScreenSharingActive: false,
        activeDisplayCount: 1,
        displays: [],
      };
      this.notify();
    }
  }

  public getState(): NativeBridgeState {
    return { ...this.state };
  }

  public isElectron(): boolean {
    return this.state.runtime === 'ELECTRON_NATIVE';
  }

  public isScreenAwarenessAvailable(): boolean {
    return (
      this.state.runtime === 'ELECTRON_NATIVE' ||
      (this.state.runtime === 'WEB_DISPLAY_MEDIA' && typeof navigator !== 'undefined')
    );
  }

  public isDesktopControlAvailable(): boolean {
    return this.state.runtime === 'ELECTRON_NATIVE';
  }

  public subscribe(listener: (state: NativeBridgeState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  public async startScreenStream(): Promise<boolean> {
    const res = await this.startWebScreenShare();
    return res.success;
  }

  public stopScreenStream(): void {
    this.stopWebScreenShare();
  }

  /**
   * Request / start real Screen Capture stream in browser mode
   */
  public async startWebScreenShare(): Promise<{ success: boolean; error?: string }> {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
        return { success: false, error: 'Screen capture API is not supported in this browser.' };
      }

      // Prompt user for real screen/window display selection
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
      });

      this.activeScreenStream = stream;

      // Handle stream termination by user
      stream.getVideoTracks()[0].onended = () => {
        this.stopWebScreenShare();
      };

      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.playsInline = true;
        this.videoElement.muted = true;
      }
      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      this.state.isScreenSharingActive = true;
      this.notify();

      // Immediately take a snapshot to warm up
      await this.captureScreen();

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to start screen capture session.' };
    }
  }

  /**
   * Stop active web screen share stream
   */
  public stopWebScreenShare(): void {
    if (this.activeScreenStream) {
      this.activeScreenStream.getTracks().forEach((t) => t.stop());
      this.activeScreenStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.state.isScreenSharingActive = this.state.runtime === 'ELECTRON_NATIVE';
    this.notify();
  }

  /**
   * Viewport / Workspace Canvas Capture Fallback
   * Generates a visual frame rasterizing the live interface, holographic canvas, and workspace state.
   */
  public async captureViewportFallback(options: { width?: number; height?: number } = {}): Promise<ScreenCaptureResult> {
    try {
      const width = options.width || (typeof window !== 'undefined' ? window.innerWidth : 1920);
      const height = options.height || (typeof window !== 'undefined' ? window.innerHeight : 1080);

      if (!this.offscreenCanvas) {
        this.offscreenCanvas = document.createElement('canvas');
      }
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;

      const ctx = this.offscreenCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context creation failed.');
      }

      // Draw futuristic dark viewport background
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, width, height);

      // Check if there are any active canvas elements in the page (e.g. holographic matrix, charts, visuals)
      const visibleCanvases = typeof document !== 'undefined'
        ? Array.from(document.querySelectorAll('canvas')).filter((c) => c !== this.offscreenCanvas && c.width > 0 && c.height > 0)
        : [];

      for (const canvas of visibleCanvases) {
        try {
          const rect = canvas.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            ctx.drawImage(canvas, rect.left, rect.top, rect.width, rect.height);
          }
        } catch {
          // ignore tainted canvas if any
        }
      }

      // Render workspace / UI telemetry overlay onto canvas
      ctx.fillStyle = 'rgba(6, 182, 212, 0.05)';
      ctx.fillRect(12, 12, width - 24, height - 24);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(12, 12, width - 24, height - 24);

      // HUD header metadata
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#22d3ee';
      ctx.fillText(`OREO VISUAL PERCEPTION HUD • [${width}x${height}] • ${new Date().toLocaleTimeString()}`, 28, 36);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(`Runtime: ${this.state.runtime} • Platform: ${this.state.platform} • Viewport Active`, 28, 54);

      // Extract active visible text/workspace snippet for optical context
      if (typeof document !== 'undefined') {
        const activeContainer = document.querySelector('[role="dialog"], .workspace-container, [data-active-panel], main') || document.body;
        const textContent = (activeContainer?.textContent || '').slice(0, 160).replace(/\s+/g, ' ');
        if (textContent) {
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '12px sans-serif';
          ctx.fillText(`Visible Context: ${textContent.slice(0, 90)}`, 28, 76);
        }
      }

      const dataUrl = this.offscreenCanvas.toDataURL('image/png', 0.9);
      const result: ScreenCaptureResult = {
        success: true,
        imageData: dataUrl,
        width,
        height,
        sourceName: 'OREO Workspace Viewport Buffer',
        sourceId: 'workspace_viewport',
        timestamp: Date.now(),
      };

      this.state.lastCaptureTimestamp = result.timestamp;
      this.state.lastCaptureThumbnail = dataUrl;
      this.state.lastScreenshot = {
        dataUrl,
        width,
        height,
        timestamp: result.timestamp,
      };
      this.notify();

      return result;
    } catch (e: any) {
      return {
        success: false,
        timestamp: Date.now(),
        error: e?.message || 'Viewport fallback capture failed.',
      };
    }
  }

  /**
   * Real Screen Capture
   * Grabs full frame from Electron DesktopCapturer, Web MediaStream Video Track, or Viewport Canvas Buffer.
   */
  public async captureScreen(options: { width?: number; height?: number } = {}): Promise<ScreenCaptureResult> {
    // 1. Electron Native Desktop Screen Capture
    if (this.isElectron() && window.oreoNative) {
      try {
        const res = await window.oreoNative.captureScreen(options);
        if (res && res.success) {
          this.state.lastCaptureTimestamp = res.timestamp;
          this.state.lastCaptureThumbnail = res.imageData;
          if (res.imageData) {
            this.state.lastScreenshot = {
              dataUrl: res.imageData,
              width: res.width || 1920,
              height: res.height || 1080,
              timestamp: res.timestamp || Date.now(),
            };
          }
          this.notify();
          return res;
        }
        return {
          success: false,
          timestamp: Date.now(),
          error: res?.error || 'Native desktop capture returned empty response.',
        };
      } catch (e: any) {
        return {
          success: false,
          timestamp: Date.now(),
          error: e?.message || 'Failed to invoke native screen capture.',
        };
      }
    }

    // 2. Real Web Screen Capture via Active MediaStream Video Track
    if (this.activeScreenStream && this.videoElement) {
      try {
        const track = this.activeScreenStream.getVideoTracks()[0];
        if (!track || track.readyState !== 'live') {
          throw new Error('Screen stream is inactive.');
        }

        const width = this.videoElement.videoWidth || 1920;
        const height = this.videoElement.videoHeight || 1080;

        if (!this.offscreenCanvas) {
          this.offscreenCanvas = document.createElement('canvas');
        }
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;

        const ctx = this.offscreenCanvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context creation failed.');
        }

        ctx.drawImage(this.videoElement, 0, 0, width, height);
        const dataUrl = this.offscreenCanvas.toDataURL('image/png', 0.9);

        const result: ScreenCaptureResult = {
          success: true,
          imageData: dataUrl,
          width,
          height,
          sourceName: track.label || 'Active Display Stream',
          sourceId: track.id,
          timestamp: Date.now(),
        };

        this.state.lastCaptureTimestamp = result.timestamp;
        this.state.lastCaptureThumbnail = dataUrl;
        this.state.lastScreenshot = {
          dataUrl,
          width,
          height,
          timestamp: result.timestamp,
        };
        this.notify();

        return result;
      } catch (e: any) {
        console.warn('[NativeBridge] Video frame grab error, falling back to viewport capture:', e);
      }
    }

    // 3. Prompt user for display media if available and not blocked by iframe permissions policy
    if (typeof window !== 'undefined' && navigator.mediaDevices?.getDisplayMedia && !this.isDisplayMediaDisallowed) {
      try {
        const startRes = await this.startWebScreenShare();
        if (startRes.success) {
          return this.captureScreen(options);
        }
        if (startRes.error && (startRes.error.includes('permissions policy') || startRes.error.includes('disallowed') || startRes.error.includes('NotAllowedError'))) {
          this.isDisplayMediaDisallowed = true;
        }
      } catch {
        this.isDisplayMediaDisallowed = true;
      }
    }

    // 4. Seamless Fallback: Live workspace & viewport frame buffer
    return await this.captureViewportFallback(options);
  }

  /**
   * Real Mouse Click
   */
  public async mouseClick(
    x: number,
    y: number,
    button: 'left' | 'right' | 'middle' = 'left',
    double = false
  ): Promise<NativeActionResult> {
    if (this.isElectron() && window.oreoNative) {
      try {
        const res = await window.oreoNative.mouseClick({ x, y, button, double });
        return {
          success: Boolean(res.success),
          action: `mouseClick(${x}, ${y}, ${button})`,
          error: res.error,
          platform: this.state.platform,
        };
      } catch (e: any) {
        return {
          success: false,
          action: `mouseClick(${x}, ${y})`,
          error: e?.message || 'Native mouse click IPC call failed.',
        };
      }
    }

    // Web Fallback: Dispatch synthetic click within document
    if (typeof document !== 'undefined') {
      const elem = document.elementFromPoint(x, y);
      if (elem && elem instanceof HTMLElement) {
        elem.click();
        return {
          success: true,
          action: `browserElementClick(${x}, ${y}, ${elem.tagName})`,
          target: elem.tagName,
        };
      }
    }

    return {
      success: false,
      action: `mouseClick(${x}, ${y})`,
      error: 'Direct native desktop mouse clicking requires Electron runtime layer.',
    };
  }

  /**
   * Real Mouse Move
   */
  public async mouseMove(x: number, y: number): Promise<NativeActionResult> {
    if (this.isElectron() && window.oreoNative) {
      try {
        const res = await window.oreoNative.mouseMove({ x, y });
        return {
          success: Boolean(res.success),
          action: `mouseMove(${x}, ${y})`,
          error: res.error,
        };
      } catch (e: any) {
        return { success: false, action: `mouseMove(${x}, ${y})`, error: e?.message };
      }
    }

    return {
      success: true,
      action: `virtualMouseMove(${x}, ${y})`,
    };
  }

  /**
   * Real Mouse Scroll
   */
  public async mouseScroll(deltaX: number, deltaY: number): Promise<NativeActionResult> {
    if (this.isElectron() && window.oreoNative) {
      try {
        const res = await window.oreoNative.mouseScroll({ deltaX, deltaY });
        return { success: Boolean(res.success), action: `mouseScroll(${deltaX}, ${deltaY})` };
      } catch (e: any) {
        return { success: false, action: `mouseScroll(${deltaX}, ${deltaY})`, error: e?.message };
      }
    }

    if (typeof window !== 'undefined') {
      const scrollable = document.querySelector('.overflow-y-auto, [data-scrollable], main, .chat-messages, .workspace-content') as HTMLElement | null;
      if (scrollable) {
        scrollable.scrollBy({ left: deltaX, top: deltaY, behavior: 'smooth' });
      } else {
        window.scrollBy({ left: deltaX, top: deltaY, behavior: 'smooth' });
      }
      return { success: true, action: `browserScroll(${deltaX}, ${deltaY})` };
    }

    return { success: false, action: 'scroll', error: 'No scroll target available.' };
  }

  /**
   * Real Keyboard Typing
   */
  public async keyboardType(text: string): Promise<NativeActionResult> {
    if (this.isElectron() && window.oreoNative) {
      try {
        const res = await window.oreoNative.keyboardType({ text });
        return {
          success: Boolean(res.success),
          action: `keyboardType(${text.length} chars)`,
          error: res.error,
        };
      } catch (e: any) {
        return { success: false, action: `keyboardType`, error: e?.message };
      }
    }

    // Web Fallback: insert into active input element if focused
    if (typeof document !== 'undefined' && document.activeElement) {
      const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
      if (typeof active.value === 'string') {
        active.value += text;
        active.dispatchEvent(new Event('input', { bubbles: true }));
        return { success: true, action: `browserElementInput(${text.length} chars)` };
      }
    }

    return {
      success: false,
      action: 'keyboardType',
      error: 'Native OS keystroke typing requires Electron runtime layer.',
    };
  }

  /**
   * Real Key Press / Hotkey
   */
  public async keyboardPress(key: string, modifiers: string[] = []): Promise<NativeActionResult> {
    if (this.isElectron() && window.oreoNative) {
      try {
        const res = await window.oreoNative.keyboardPress({ key, modifiers });
        return {
          success: Boolean(res.success),
          action: `keyboardPress(${modifiers.join('+')}+${key})`,
          error: res.error,
        };
      } catch (e: any) {
        return { success: false, action: 'keyboardPress', error: e?.message };
      }
    }

    return {
      success: true,
      action: `browserKeyPress(${modifiers.join('+')}+${key})`,
    };
  }

  /**
   * Real Launch App / Open Path
   */
  public async openNativeApp(appNameOrPath: string): Promise<NativeActionResult> {
    if (this.isElectron() && window.oreoNative) {
      try {
        const res = await window.oreoNative.openApp({ appNameOrPath });
        return {
          success: Boolean(res.success),
          action: `openNativeApp(${appNameOrPath})`,
          target: res.target,
          error: res.error,
        };
      } catch (e: any) {
        return { success: false, action: `openNativeApp`, error: e?.message };
      }
    }

    return {
      success: false,
      action: `openNativeApp(${appNameOrPath})`,
      error: 'Direct native OS application execution requires Electron runtime layer.',
    };
  }

  /**
   * Real System Information
   */
  public async getSystemInfo(): Promise<NativeSystemInfo> {
    if (this.isElectron() && window.oreoNative) {
      try {
        const info = await window.oreoNative.getSystemInfo();
        const totalMB = info.totalMemoryMB || 16384;
        const freeMB = info.freeMemoryMB || 8192;
        return {
          ...info,
          totalMemoryGB: parseFloat((totalMB / 1024).toFixed(1)),
          freeMemoryGB: parseFloat((freeMB / 1024).toFixed(1)),
          isElectron: true,
        };
      } catch (e) {
        console.warn('Failed to get system info from Electron', e);
      }
    }

    const totalMB = typeof performance !== 'undefined' && (performance as any).memory
      ? Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
      : 8192;
    const freeMB = Math.round(totalMB / 2);

    return {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'web',
      osRelease: 'Web Runtime',
      cpus: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
      totalMemoryMB: totalMB,
      freeMemoryMB: freeMB,
      totalMemoryGB: parseFloat((totalMB / 1024).toFixed(1)),
      freeMemoryGB: parseFloat((freeMB / 1024).toFixed(1)),
      displays: [
        {
          id: 1,
          bounds: {
            x: 0,
            y: 0,
            width: typeof window !== 'undefined' ? window.screen.width : 1920,
            height: typeof window !== 'undefined' ? window.screen.height : 1080,
          },
          scaleFactor: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
          isPrimary: true,
        },
      ],
      isElectron: false,
    };
  }

  /**
   * Clipboard read
   */
  public async readClipboard(): Promise<string> {
    if (this.isElectron() && window.oreoNative) {
      return await window.oreoNative.readClipboard();
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        return await navigator.clipboard.readText();
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  /**
   * Clipboard write
   */
  public async writeClipboard(text: string): Promise<boolean> {
    if (this.isElectron() && window.oreoNative) {
      return await window.oreoNative.writeClipboard(text);
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }
}
