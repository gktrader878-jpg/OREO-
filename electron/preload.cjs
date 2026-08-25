/**
 * OREO Native Desktop Preload Bridge
 *
 * Securely exposes the native OS desktop capabilities (Mouse, Keyboard, Screen Capture,
 * Clipboard, Window management, System Diagnostics) to the React Agent runtime.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('oreoNative', {
  isNative: true,
  platform: process.platform,

  // Health check & ping
  ping: () => ipcRenderer.invoke('native:ping'),

  // Real Screen Capture & Awareness
  captureScreen: (options) => ipcRenderer.invoke('native:capture-screen', options),
  getDisplays: () => ipcRenderer.invoke('native:get-displays'),
  getCursorPosition: () => ipcRenderer.invoke('native:get-cursor'),

  // Mouse Automation
  mouseClick: (params) => ipcRenderer.invoke('native:mouse-click', params),
  mouseMove: (params) => ipcRenderer.invoke('native:mouse-move', params),
  mouseScroll: (params) => ipcRenderer.invoke('native:mouse-scroll', params),

  // Keyboard Automation
  keyboardType: (params) => ipcRenderer.invoke('native:keyboard-type', params),
  keyboardPress: (params) => ipcRenderer.invoke('native:keyboard-press', params),

  // Application & System Controls
  openApp: (params) => ipcRenderer.invoke('native:open-app', params),
  openExternal: (url) => ipcRenderer.invoke('native:open-external', url),
  getSystemInfo: () => ipcRenderer.invoke('native:system-info'),
  windowControl: (action) => ipcRenderer.invoke('native:window-control', action),

  // Clipboard Controls
  readClipboard: () => ipcRenderer.invoke('native:clipboard-read'),
  writeClipboard: (text) => ipcRenderer.invoke('native:clipboard-write', text),
});
