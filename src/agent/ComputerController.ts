/**
 * ComputerController
 *
 * Direct interface for OS and Desktop-level computer control and real screen awareness.
 * Bridges through NativeBridge to execute real operations in Electron (native desktop IPC)
 * or Web Display Capture (real stream frame capture and browser interactions).
 */

import { NativeBridge, ScreenCaptureResult, NativeActionResult, NativeSystemInfo } from '../services/NativeBridge';

export interface ScreenObservationResult {
  supported: boolean;
  message: string;
  viewportDimensions?: { width: number; height: number };
  capture?: ScreenCaptureResult;
}

export interface ComputerActionResult {
  success: boolean;
  action: string;
  target?: string;
  error?: string;
  unsupportedReason?: string;
  platform?: string;
}

export class ComputerController {
  private static instance: ComputerController | null = null;
  private bridge: NativeBridge;

  public static getInstance(): ComputerController {
    if (!ComputerController.instance) {
      ComputerController.instance = new ComputerController();
    }
    return ComputerController.instance;
  }

  constructor() {
    this.bridge = NativeBridge.getInstance();
  }

  public get isNativeDesktopSupported(): boolean {
    return this.bridge.isDesktopControlAvailable();
  }

  public get isNativeScreenCaptureSupported(): boolean {
    return this.bridge.isScreenAwarenessAvailable();
  }

  public get isNativeKeyboardMouseSupported(): boolean {
    return this.bridge.isDesktopControlAvailable();
  }

  public getBridge(): NativeBridge {
    return this.bridge;
  }

  /**
   * Real Screen Capture & Awareness Observation
   */
  public async captureScreen(options: { width?: number; height?: number } = {}): Promise<ScreenCaptureResult> {
    return await this.bridge.captureScreen(options);
  }

  /**
   * Observe current screen state (real visual snapshot or viewport fallback).
   */
  public async observeScreen(): Promise<ScreenObservationResult> {
    try {
      const capture = await this.bridge.captureScreen();
      if (capture.success) {
        return {
          supported: true,
          message: `Screen captured successfully (${capture.width}x${capture.height}) via ${capture.sourceName || 'display stream'}.`,
          viewportDimensions: {
            width: capture.width || (typeof window !== 'undefined' ? window.innerWidth : 1920),
            height: capture.height || (typeof window !== 'undefined' ? window.innerHeight : 1080),
          },
          capture,
        };
      }

      if (typeof window !== 'undefined') {
        return {
          supported: true,
          message: 'Browser viewport observation active.',
          viewportDimensions: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        };
      }

      return {
        supported: false,
        message: capture.error || 'Screen capture could not be initialized.',
      };
    } catch (e: any) {
      return {
        supported: false,
        message: e?.message || 'Failed to observe screen.',
      };
    }
  }

  /**
   * Real Desktop Mouse Click
   */
  public async click(
    x: number,
    y: number,
    button: 'left' | 'right' | 'middle' = 'left',
    double = false
  ): Promise<ComputerActionResult> {
    const res = await this.bridge.mouseClick(x, y, button, double);
    return {
      success: res.success,
      action: res.action,
      target: res.target,
      error: res.error,
      platform: res.platform,
    };
  }

  /**
   * Real Mouse Move
   */
  public async moveMouse(x: number, y: number): Promise<ComputerActionResult> {
    const res = await this.bridge.mouseMove(x, y);
    return {
      success: res.success,
      action: res.action,
      error: res.error,
    };
  }

  /**
   * Real Desktop Keystroke Typing
   */
  public async type(text: string): Promise<ComputerActionResult> {
    const res = await this.bridge.keyboardType(text);
    return {
      success: res.success,
      action: res.action,
      error: res.error,
    };
  }

  /**
   * Real Key Press / Hotkey
   */
  public async keyPress(key: string, modifiers: string[] = []): Promise<ComputerActionResult> {
    const res = await this.bridge.keyboardPress(key, modifiers);
    return {
      success: res.success,
      action: res.action,
      error: res.error,
    };
  }

  /**
   * Real Mouse Scroll
   */
  public async scroll(deltaX: number, deltaY: number): Promise<ComputerActionResult> {
    const res = await this.bridge.mouseScroll(deltaX, deltaY);
    return {
      success: res.success,
      action: res.action,
      error: res.error,
    };
  }

  /**
   * Real Launch App / Open Path
   */
  public async launchNativeApp(appNameOrPath: string): Promise<ComputerActionResult> {
    const res = await this.bridge.openNativeApp(appNameOrPath);
    return {
      success: res.success,
      action: res.action,
      target: res.target,
      error: res.error,
    };
  }

  /**
   * Read / Write Clipboard
   */
  public async readClipboard(): Promise<string> {
    return await this.bridge.readClipboard();
  }

  public async writeClipboard(text: string): Promise<boolean> {
    return await this.bridge.writeClipboard(text);
  }

  /**
   * System Diagnostics
   */
  public async getSystemInfo(): Promise<NativeSystemInfo> {
    return await this.bridge.getSystemInfo();
  }
}
