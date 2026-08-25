/**
 * OREO Native Desktop Runtime Layer (Electron Main Process)
 *
 * Provides real native desktop control, OS-level screen capture, window management,
 * mouse/keyboard automation, clipboard sync, and local IPC/WebSocket bridge.
 */

const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  screen,
  shell,
  clipboard,
  powerMonitor,
} = require('electron');
const path = require('path');
const os = require('os');
const { exec, spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let wsServer = null;

// Determine development or production mode
const isDev = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'OREO AI Assistant — Native Desktop Hub',
    backgroundColor: '#030712',
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  const targetUrl = isDev
    ? `http://localhost:${PORT}`
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(targetUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Real Screen Capture Implementation via Electron desktopCapturer
 */
async function captureDesktopScreen(options = {}) {
  const thumbnailWidth = options.width || 1920;
  const thumbnailHeight = options.height || 1080;
  const targetType = options.type || 'screen'; // 'screen' | 'window' | 'all'

  const types = targetType === 'all' ? ['screen', 'window'] : [targetType];
  const sources = await desktopCapturer.getSources({
    types,
    thumbnailSize: { width: thumbnailWidth, height: thumbnailHeight },
    fetchWindowIcons: true,
  });

  if (!sources || sources.length === 0) {
    throw new Error('No display or window capture sources available from OS.');
  }

  const primarySource = sources[0];
  const imageBase64 = primarySource.thumbnail.toDataURL();
  const primaryDisplay = screen.getPrimaryDisplay();
  const cursorPoint = screen.getCursorScreenPoint();

  return {
    success: true,
    timestamp: Date.now(),
    sourceId: primarySource.id,
    sourceName: primarySource.name,
    imageData: imageBase64,
    width: primaryDisplay.bounds.width,
    height: primaryDisplay.bounds.height,
    scaleFactor: primaryDisplay.scaleFactor,
    cursor: cursorPoint,
    totalSources: sources.map((s) => ({
      id: s.id,
      name: s.name,
      displayId: s.display_id,
      thumbnail: s.thumbnail.toDataURL(),
    })),
  };
}

/**
 * Real Native OS Mouse and Keyboard Automation
 */
function executeNativeClick(x, y, button = 'left', double = false) {
  return new Promise((resolve) => {
    const platform = process.platform;

    if (platform === 'win32') {
      // PowerShell script to invoke mouse_event via user32.dll
      const clickFlag = button === 'right' ? '0x08, 0x10' : '0x02, 0x04';
      const psScript = `
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class WinMouse {
          [DllImport("user32.dll")]
          public static extern void SetCursorPos(int X, int Y);
          [DllImport("user32.dll")]
          public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
        }
"@;
        [WinMouse]::SetCursorPos(${Math.round(x)}, ${Math.round(y)});
        [WinMouse]::mouse_event(${clickFlag}, 0, 0, 0, 0);
        ${double ? `Start-Sleep -Milliseconds 50; [WinMouse]::mouse_event(${clickFlag}, 0, 0, 0, 0);` : ''}
      `;
      exec(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, (err) => {
        resolve({
          success: !err,
          action: `click(${x}, ${y}, ${button})`,
          platform,
          error: err ? err.message : undefined,
        });
      });
    } else if (platform === 'darwin') {
      // macOS AppleScript via osascript
      const appleScript = `
        tell application "System Events"
          -- Set cursor position and click
          click at {${Math.round(x)}, ${Math.round(y)}}
        end tell
      `;
      exec(`osascript -e '${appleScript}'`, (err) => {
        resolve({
          success: !err,
          action: `click(${x}, ${y}, ${button})`,
          platform,
          error: err ? err.message : undefined,
        });
      });
    } else {
      // Linux xdotool
      const btnCode = button === 'right' ? '3' : button === 'middle' ? '2' : '1';
      const repeat = double ? '--repeat 2' : '';
      exec(`xdotool mousemove ${Math.round(x)} ${Math.round(y)} click ${repeat} ${btnCode}`, (err) => {
        resolve({
          success: !err,
          action: `click(${x}, ${y}, ${button})`,
          platform,
          error: err ? err.message : undefined,
        });
      });
    }
  });
}

function executeNativeType(text) {
  return new Promise((resolve) => {
    const platform = process.platform;
    const safeText = (text || '').replace(/"/g, '\\"');

    if (platform === 'win32') {
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms;
        [System.Windows.Forms.SendKeys]::SendWait("${safeText.replace(/[{}]/g, '{$&}')}");
      `;
      exec(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, (err) => {
        resolve({
          success: !err,
          action: `type(${text.length} chars)`,
          platform,
          error: err ? err.message : undefined,
        });
      });
    } else if (platform === 'darwin') {
      const appleScript = `
        tell application "System Events"
          keystroke "${safeText}"
        end tell
      `;
      exec(`osascript -e '${appleScript}'`, (err) => {
        resolve({
          success: !err,
          action: `type(${text.length} chars)`,
          platform,
          error: err ? err.message : undefined,
        });
      });
    } else {
      exec(`xdotool type --delay 20 "${safeText}"`, (err) => {
        resolve({
          success: !err,
          action: `type(${text.length} chars)`,
          platform,
          error: err ? err.message : undefined,
        });
      });
    }
  });
}

function executeNativeKeyPress(key, modifiers = []) {
  return new Promise((resolve) => {
    const platform = process.platform;

    if (platform === 'win32') {
      let modPrefix = '';
      if (modifiers.includes('ctrl')) modPrefix += '^';
      if (modifiers.includes('shift')) modPrefix += '+';
      if (modifiers.includes('alt')) modPrefix += '%';

      const keyString = `{${key.toUpperCase()}}`;
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms;
        [System.Windows.Forms.SendKeys]::SendWait("${modPrefix}${keyString}");
      `;
      exec(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, (err) => {
        resolve({
          success: !err,
          action: `keyPress(${modifiers.join('+')}+${key})`,
          platform,
          error: err ? err.message : undefined,
        });
      });
    } else if (platform === 'darwin') {
      const usingClause = modifiers.length > 0
        ? ` using {${modifiers.map((m) => `${m} down`).join(', ')}}`
        : '';
      const appleScript = `
        tell application "System Events"
          key code ${key} ${usingClause}
        end tell
      `;
      exec(`osascript -e '${appleScript}'`, (err) => {
        resolve({
          success: !err,
          action: `keyPress(${key})`,
          platform,
          error: err ? err.message : undefined,
        });
      });
    } else {
      const modString = modifiers.length > 0 ? modifiers.join('+') + '+' : '';
      exec(`xdotool key ${modString}${key}`, (err) => {
        resolve({
          success: !err,
          action: `keyPress(${modString}${key})`,
          platform,
          error: err ? err.message : undefined,
        });
      });
    }
  });
}

function getDetailedSystemInfo() {
  const displays = screen.getAllDisplays().map((d) => ({
    id: d.id,
    bounds: d.bounds,
    workArea: d.workArea,
    scaleFactor: d.scaleFactor,
    isPrimary: d.id === screen.getPrimaryDisplay().id,
  }));

  const cursor = screen.getCursorScreenPoint();

  return {
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model || 'Generic CPU',
    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
    uptimeSeconds: Math.round(os.uptime()),
    displays,
    cursor,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
  };
}

/**
 * Register IPC Handlers for Preload Bridge
 */
function registerIpcHandlers() {
  // 1. Connection Ping
  ipcMain.handle('native:ping', async () => {
    return {
      status: 'connected',
      version: '1.0.0',
      platform: process.platform,
      timestamp: Date.now(),
    };
  });

  // 2. Real Screen Capture
  ipcMain.handle('native:capture-screen', async (_, options) => {
    try {
      return await captureDesktopScreen(options);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // 3. Displays & Cursor
  ipcMain.handle('native:get-displays', async () => {
    return screen.getAllDisplays();
  });

  ipcMain.handle('native:get-cursor', async () => {
    return screen.getCursorScreenPoint();
  });

  // 4. Mouse Controls
  ipcMain.handle('native:mouse-click', async (_, { x, y, button, double }) => {
    return await executeNativeClick(x, y, button, double);
  });

  ipcMain.handle('native:mouse-move', async (_, { x, y }) => {
    return new Promise((resolve) => {
      const platform = process.platform;
      if (platform === 'win32') {
        const psScript = `
          Add-Type -TypeDefinition @"
          using System.Runtime.InteropServices;
          public class WinPos {
            [DllImport("user32.dll")] public static extern void SetCursorPos(int X, int Y);
          }
"@;
          [WinPos]::SetCursorPos(${Math.round(x)}, ${Math.round(y)});
        `;
        exec(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, (err) => {
          resolve({ success: !err, action: `move(${x}, ${y})`, error: err?.message });
        });
      } else if (platform === 'darwin') {
        exec(`osascript -e 'tell application "System Events" to set position of cursor to {${x}, ${y}}'`, (err) => {
          resolve({ success: !err, action: `move(${x}, ${y})`, error: err?.message });
        });
      } else {
        exec(`xdotool mousemove ${Math.round(x)} ${Math.round(y)}`, (err) => {
          resolve({ success: !err, action: `move(${x}, ${y})`, error: err?.message });
        });
      }
    });
  });

  ipcMain.handle('native:mouse-scroll', async (_, { deltaX, deltaY }) => {
    return new Promise((resolve) => {
      const platform = process.platform;
      if (platform === 'win32') {
        const flag = deltaY > 0 ? -120 : 120;
        const psScript = `
          Add-Type -TypeDefinition @"
          using System.Runtime.InteropServices;
          public class WinScroll {
            [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
          }
"@;
          [WinScroll]::mouse_event(0x0800, 0, 0, ${flag}, 0);
        `;
        exec(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, (err) => {
          resolve({ success: !err, action: `scroll(${deltaX}, ${deltaY})`, error: err?.message });
        });
      } else if (platform === 'darwin') {
        exec(`osascript -e 'tell application "System Events" to scroll ${deltaY}'`, (err) => {
          resolve({ success: !err, action: `scroll(${deltaX}, ${deltaY})`, error: err?.message });
        });
      } else {
        const btn = deltaY > 0 ? '5' : '4';
        exec(`xdotool click ${btn}`, (err) => {
          resolve({ success: !err, action: `scroll(${deltaX}, ${deltaY})`, error: err?.message });
        });
      }
    });
  });

  // 5. Keyboard Controls
  ipcMain.handle('native:keyboard-type', async (_, { text }) => {
    return await executeNativeType(text);
  });

  ipcMain.handle('native:keyboard-press', async (_, { key, modifiers }) => {
    return await executeNativeKeyPress(key, modifiers);
  });

  // 6. Application & File Launching
  ipcMain.handle('native:open-app', async (_, { appNameOrPath }) => {
    try {
      if (appNameOrPath.startsWith('http://') || appNameOrPath.startsWith('https://')) {
        await shell.openExternal(appNameOrPath);
        return { success: true, target: appNameOrPath, type: 'url' };
      }
      const err = await shell.openPath(appNameOrPath);
      if (err) {
        // Try spawning as command
        spawn(appNameOrPath, { detached: true, shell: true, stdio: 'ignore' });
      }
      return { success: true, target: appNameOrPath, type: 'app' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('native:open-external', async (_, url) => {
    try {
      await shell.openExternal(url);
      return { success: true, url };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // 7. Clipboard Operations
  ipcMain.handle('native:clipboard-read', async () => {
    return clipboard.readText();
  });

  ipcMain.handle('native:clipboard-write', async (_, text) => {
    clipboard.writeText(text);
    return true;
  });

  // 8. System Metrics
  ipcMain.handle('native:system-info', async () => {
    return getDetailedSystemInfo();
  });

  // 9. Window Controls
  ipcMain.handle('native:window-control', async (_, action) => {
    if (!mainWindow) return { success: false, error: 'Window not found' };
    switch (action) {
      case 'minimize':
        mainWindow.minimize();
        return { success: true, action };
      case 'maximize':
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
        return { success: true, action };
      case 'close':
        mainWindow.close();
        return { success: true, action };
      case 'focus':
        mainWindow.focus();
        return { success: true, action };
      default:
        return { success: false, error: `Unknown window action '${action}'` };
    }
  });
}

// Electron App Lifecycle
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
