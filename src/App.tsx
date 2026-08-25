import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, MicOff, RefreshCw, X, MessageSquare } from 'lucide-react';
import { ActiveToolsHUD } from './components/ActiveToolsHUD';
import { BrowserWorkspace } from './components/BrowserWorkspace';
import { AudioWaveform } from './components/AudioWaveform';
import { ControlDock } from './components/ControlDock';
import { FuturisticBackground } from './components/FuturisticBackground';
import { HeaderHUD } from './components/HeaderHUD';
import { HolographicAvatar } from './components/HolographicAvatar';
import { MemoryPanel } from './components/MemoryPanel';
import { AgentPanel } from './components/AgentPanel';
import { SettingsModal } from './components/SettingsModal';
import { AppController } from './services/AppController';
import { BrowserController } from './browser/BrowserController';
import { LiveSession } from './services/LiveSession';
import { MemoryManager } from './services/MemoryManager';
import { ToolManager } from './services/ToolManager';
import { AgentEngine } from './agent/AgentEngine';
import { AgentStatus } from './agent/AgentTypes';
import { ActiveTimer, AssistantState, OpenedWebsite, ResponseSpeedMode, SessionTelemetry, ToolActionLog, VisualizerMode, VoiceOption, WorkspaceState } from './types';

export default function App() {
  const toolManager = useMemo(() => new ToolManager(), []);
  const liveSession = useMemo(() => new LiveSession(toolManager), [toolManager]);
  const appController = useMemo(() => AppController.getInstance(), []);
  const memoryManager = useMemo(() => MemoryManager.getInstance(), []);

  const [state, setState] = useState<AssistantState>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('orb');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState<boolean>(false);
  const [isAgentOpen, setIsAgentOpen] = useState<boolean>(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>(AgentEngine.getInstance().getStatus());
  const [memoryCount, setMemoryCount] = useState<number>(0);
  const [workspace, setWorkspace] = useState<WorkspaceState>(appController.getState());

  const [telemetry, setTelemetry] = useState<SessionTelemetry>({
    latencyMs: 0,
    bytesSent: 0,
    bytesReceived: 0,
    sessionDuration: 0,
    userVolume: 0,
    assistantVolume: 0,
    currentVoice: 'Puck',
    responseSpeedMode: 'turbo',
    emotion: {
      current: 'neutral',
      intensity: 0.0,
      updatedAt: Date.now(),
    },
  });

  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [openedWebsites, setOpenedWebsites] = useState<OpenedWebsite[]>([]);
  const [toolLogs, setToolLogs] = useState<ToolActionLog[]>([]);

  // Refresh memory count
  const refreshMemoryCount = async () => {
    try {
      const stats = await memoryManager.getStats();
      setMemoryCount(stats.totalCount);
    } catch (e) {
      console.warn('Could not load memory stats', e);
    }
  };

  // Subscribe to live session state, telemetry, tools, app workspace, and memory
  useEffect(() => {
    refreshMemoryCount();

    const unsubState = liveSession.subscribeState((newState) => {
      setState(newState);
      if (newState === 'error') {
        setErrorMessage(liveSession.getErrorMessage());
      } else {
        setErrorMessage(null);
      }
    });

    const unsubTelemetry = liveSession.subscribeTelemetry((newTelemetry) => {
      setTelemetry({ ...newTelemetry });
    });

    const unsubTools = toolManager.subscribe(() => {
      setActiveTimers([...toolManager.getActiveTimers()]);
      setOpenedWebsites([...toolManager.getOpenedWebsites()]);
      setToolLogs([...toolManager.getToolLogs()]);
      refreshMemoryCount();
    });

    const unsubWorkspace = appController.subscribe((newWorkspace) => {
      setWorkspace({ ...newWorkspace });
    });

    const unsubMemory = memoryManager.subscribe(() => {
      refreshMemoryCount();
    });

    const unsubAgent = AgentEngine.getInstance().subscribe((ev) => {
      setAgentStatus(AgentEngine.getInstance().getStatus());
      if (ev.type === 'waiting_confirmation') {
        setIsAgentOpen(true); // Pop open modal so user can quickly review & approve
      }
    });

    return () => {
      unsubState();
      unsubTelemetry();
      unsubTools();
      unsubWorkspace();
      unsubMemory();
      unsubAgent();
      liveSession.destroy();
      toolManager.destroy();
    };
  }, [liveSession, toolManager, appController, memoryManager]);

  const handleToggleConnect = async () => {
    if (state === 'disconnected' || state === 'error') {
      try {
        await liveSession.connect(telemetry.currentVoice);
      } catch (err: any) {
        console.warn('Failed to initiate live session:', err?.message || err);
      }
    } else {
      liveSession.disconnect();
    }
  };

  const handleToggleMute = () => {
    const muted = liveSession.toggleMute();
    setIsMuted(muted);
  };

  const handleSelectVoice = (voice: VoiceOption) => {
    liveSession.setVoice(voice);
  };

  const handleSelectSpeedMode = (mode: ResponseSpeedMode) => {
    liveSession.setResponseSpeedMode(mode);
  };

  const handleCancelTimer = (id: string) => {
    toolManager.cancelTimer(id);
    setActiveTimers([...toolManager.getActiveTimers()]);
  };

  const handleSendTextMessage = async (text: string) => {
    try {
      await liveSession.sendTextMessage(text);
    } catch (err) {
      console.warn('Failed to send text message:', err);
    }
  };

  const [browserState, setBrowserState] = useState(BrowserController.getInstance().getState());

  useEffect(() => {
    const unsub = BrowserController.getInstance().subscribe((s) => setBrowserState(s));
    return unsub;
  }, []);

  const handleToggleWorkspace = () => {
    const bc = BrowserController.getInstance();
    if (bc.getState().isOpen && !bc.getState().isMinimized) {
      bc.toggleMinimize();
    } else if (bc.getState().isOpen && bc.getState().isMinimized) {
      bc.toggleMinimize();
    } else {
      bc.toggleWorkspace(true);
    }
  };

  return (
    <div className="relative w-full h-screen h-[100dvh] flex flex-col justify-between overflow-hidden bg-[#020202] text-white font-sans select-none">
      {/* Sleek Ambient Lighting Background */}
      <FuturisticBackground />

      {/* Sleek Navigation & Telemetry HUD */}
      <HeaderHUD
        state={state}
        telemetry={telemetry}
        memoryCount={memoryCount}
        agentStatus={agentStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenAgent={() => setIsAgentOpen(true)}
      />

      {/* Central Real Integrated Browser Workspace */}
      <BrowserWorkspace browserState={browserState} />

      {/* Main Stage: Sleek Visualizer Orb & Responsive Waveform Spectrum */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 w-full max-w-4xl mx-auto my-auto">
        {/* Error notification banner & permissions troubleshooting */}
        {state === 'error' && errorMessage && (
          <div className="mb-4 w-full max-w-lg px-4 py-3 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs font-mono shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                  {errorMessage.toLowerCase().includes('microphone') ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-red-300 text-sm mb-0.5">
                    {errorMessage.toLowerCase().includes('microphone')
                      ? 'Microphone Permission Required'
                      : 'Connection Notice'}
                  </p>
                  <p className="text-zinc-300 leading-relaxed">{errorMessage}</p>

                  {errorMessage.toLowerCase().includes('microphone') && (
                    <p className="text-[11px] text-zinc-400 mt-1.5 border-t border-red-500/10 pt-1.5">
                      💡 Tip: Allow microphone in browser URL settings, or open in a new tab to prompt for permission.
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => window.open(window.location.href, '_blank')}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] flex items-center gap-1.5 transition-colors border border-white/10"
              >
                <ExternalLink className="w-3 h-3" />
                Open in New Tab
              </button>
              <button
                onClick={handleToggleConnect}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-[11px] flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <RefreshCw className="w-3 h-3" />
                Retry Mic Access
              </button>
            </div>
          </div>
        )}

        {/* Central Holographic Anime AI Avatar Core */}
        <div className="w-full flex-1 flex flex-col items-center justify-center my-auto min-h-0">
          <HolographicAvatar
            state={state}
            audioStreamer={liveSession.getAudioStreamer()}
            audioPlayer={liveSession.getAudioPlayer()}
            userVolume={telemetry.userVolume}
            assistantVolume={telemetry.assistantVolume}
            emotion={telemetry.emotion}
            isMuted={isMuted}
            onAvatarClick={handleToggleConnect}
          />
        </div>

        {/* Active Tools HUD (Timers, Links, Actions) */}
        <div className="w-full flex justify-center mt-2">
          <ActiveToolsHUD
            timers={activeTimers}
            openedWebsites={openedWebsites}
            toolLogs={toolLogs}
            onCancelTimer={handleCancelTimer}
          />
        </div>
      </main>

      {/* Sleek Interface Control Dock Footer */}
      <footer className="w-full flex justify-center z-30">
        <ControlDock
          state={state}
          isMuted={isMuted}
          workspaceOpen={browserState.isOpen && !browserState.isMinimized}
          memoryCount={memoryCount}
          agentStatus={agentStatus}
          onToggleConnect={handleToggleConnect}
          onToggleMute={handleToggleMute}
          onToggleWorkspace={handleToggleWorkspace}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenMemory={() => setIsMemoryOpen(true)}
          onOpenAgent={() => setIsAgentOpen(true)}
          onSendTextMessage={handleSendTextMessage}
        />
      </footer>

      {/* Autonomous Multi-Step Agent Engine Panel Modal */}
      <AgentPanel
        isOpen={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
      />

      {/* System Settings & Diagnostics Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedVoice={telemetry.currentVoice}
        onSelectVoice={handleSelectVoice}
        visualizerMode={visualizerMode}
        onSelectVisualizerMode={setVisualizerMode}
        responseSpeedMode={telemetry.responseSpeedMode || 'turbo'}
        onSelectSpeedMode={handleSelectSpeedMode}
        telemetry={telemetry}
      />

      {/* Intelligent Long-Term Memory Core Modal */}
      <MemoryPanel
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
      />
    </div>
  );
}
