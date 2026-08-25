import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Copy,
  Cpu,
  ExternalLink,
  Eye,
  History,
  Layers,
  Maximize2,
  Monitor,
  MousePointer,
  Pause,
  Play,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  StopCircle,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { AgentEngine } from '../agent/AgentEngine';
import { AgentTaskManager } from '../agent/AgentTaskManager';
import { ToolRouter } from '../agent/ToolRouter';
import { NativeBridge, NativeBridgeState } from '../services/NativeBridge';
import { ComputerController } from '../agent/ComputerController';
import {
  AgentEvent,
  AgentStatus,
  AgentStep,
  AgentTask,
} from '../agent/AgentTypes';

interface AgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ isOpen, onClose }) => {
  const agentEngine = AgentEngine.getInstance();
  const taskManager = AgentTaskManager.getInstance();
  const toolRouter = ToolRouter.getInstance();
  const nativeBridge = NativeBridge.getInstance();
  const computerController = ComputerController.getInstance();

  const [status, setStatus] = useState<AgentStatus>(agentEngine.getStatus());
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(agentEngine.getCurrentTask());
  const [goalInput, setGoalInput] = useState('');
  const [activeTab, setActiveTab] = useState<'plan' | 'history' | 'capabilities'>('plan');
  const [tasksHistory, setTasksHistory] = useState<AgentTask[]>(taskManager.getAllTasks());
  const [eventLog, setEventLog] = useState<{ id: string; msg: string; time: string }[]>([]);

  // Real Native & Screen Awareness State
  const [bridgeState, setBridgeState] = useState<NativeBridgeState>(nativeBridge.getState());
  const [isCapturing, setIsCapturing] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [systemDiag, setSystemDiag] = useState<any | null>(null);

  useEffect(() => {
    const unsubAgent = agentEngine.subscribe((event: AgentEvent) => {
      setStatus(agentEngine.getStatus());
      setCurrentTask(agentEngine.getCurrentTask());
      setTasksHistory(taskManager.getAllTasks());

      if (event.message) {
        setEventLog((prev) => [
          {
            id: `ev_${Date.now()}_${Math.random()}`,
            msg: event.message || event.type,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
          ...prev.slice(0, 15),
        ]);
      }
    });

    const unsubBridge = nativeBridge.subscribe((state) => {
      setBridgeState(state);
    });

    return () => {
      unsubAgent();
      unsubBridge();
    };
  }, [agentEngine, taskManager, nativeBridge]);

  if (!isOpen) return null;

  const handleCaptureScreen = async () => {
    setIsCapturing(true);
    setTestFeedback('Capturing real screen frame...');
    try {
      const res = await computerController.captureScreen();
      if (res.success) {
        setTestFeedback(`✓ Screen frame captured (${res.width}x${res.height}) from ${res.sourceName || 'display'}`);
      } else {
        setTestFeedback(`✗ Capture failed: ${res.error}`);
      }
    } catch (e: any) {
      setTestFeedback(`✗ Capture error: ${e?.message}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleToggleLiveStream = async () => {
    if (bridgeState.isScreenSharingActive) {
      nativeBridge.stopScreenStream();
      setTestFeedback('Display stream stopped.');
    } else {
      setTestFeedback('Requesting display media stream...');
      const ok = await nativeBridge.startScreenStream();
      if (ok) {
        setTestFeedback('✓ Live display media stream active.');
      } else {
        setTestFeedback('✗ Screen stream permission cancelled or unavailable.');
      }
    }
  };

  const handleTestClick = async () => {
    setTestFeedback('Executing native mouse click at (500, 300)...');
    try {
      const res = await computerController.click(500, 300, 'left');
      if (res.success) {
        setTestFeedback(`✓ Native mouse click dispatched at (500, 300) [${res.platform || 'OS'}]`);
      } else {
        setTestFeedback(`✗ Mouse click failed: ${res.error}`);
      }
    } catch (e: any) {
      setTestFeedback(`✗ Error: ${e?.message}`);
    }
  };

  const handleTestType = async () => {
    setTestFeedback('Injecting keystrokes into active focus...');
    try {
      const res = await computerController.type('Hello from OREO Agent');
      if (res.success) {
        setTestFeedback(`✓ Native typing dispatched [${res.platform || 'OS'}]`);
      } else {
        setTestFeedback(`✗ Typing failed: ${res.error}`);
      }
    } catch (e: any) {
      setTestFeedback(`✗ Error: ${e?.message}`);
    }
  };

  const handleReadClipboard = async () => {
    try {
      const text = await computerController.readClipboard();
      setTestFeedback(`✓ Clipboard contents: "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`);
    } catch (e: any) {
      setTestFeedback(`✗ Clipboard error: ${e?.message}`);
    }
  };

  const handleGetSystemInfo = async () => {
    try {
      const diag = await computerController.getSystemInfo();
      setSystemDiag(diag);
      setTestFeedback(`✓ OS Metrics: ${diag.platform} (${diag.arch}) - ${diag.cpus} CPUs, ${diag.totalMemoryGB}GB RAM`);
    } catch (e: any) {
      setTestFeedback(`✗ System info error: ${e?.message}`);
    }
  };

  if (!isOpen) return null;

  const handleStartGoal = (goalToRun?: string) => {
    const g = (goalToRun || goalInput).trim();
    if (!g) return;
    setGoalInput('');
    agentEngine.start(g);
  };

  const handleStopAgent = () => {
    agentEngine.stop();
  };

  const handlePause = () => {
    agentEngine.pause();
  };

  const handleResume = () => {
    agentEngine.resume();
  };

  const handleConfirm = (stepId: string) => {
    if (currentTask) {
      agentEngine.confirmStep(currentTask.id, stepId);
    }
  };

  const handleReject = (stepId: string) => {
    if (currentTask) {
      agentEngine.rejectStep(currentTask.id, stepId);
    }
  };

  const capabilities = toolRouter.getCapabilities();

  const getStatusBadge = () => {
    switch (status) {
      case 'executing':
      case 'verifying':
        return (
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            EXECUTING STEP
          </span>
        );
      case 'planning':
        return (
          <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            FORMULATING PLAN
          </span>
        );
      case 'waiting_confirmation':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            NEEDS CONFIRMATION
          </span>
        );
      case 'retrying':
        return (
          <span className="px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 text-xs font-mono font-bold flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            RETRYING
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            COMPLETED
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-mono font-bold flex items-center gap-1.5">
            <StopCircle className="w-3.5 h-3.5 text-rose-400" />
            AGENT STOPPED
          </span>
        );
      case 'paused':
        return (
          <span className="px-2.5 py-1 rounded-full bg-zinc-700/40 border border-zinc-500/40 text-zinc-300 text-xs font-mono font-bold flex items-center gap-1.5">
            <Pause className="w-3.5 h-3.5 text-zinc-300" />
            PAUSED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-zinc-800/40 border border-zinc-700/40 text-zinc-400 text-xs font-mono font-bold">
            AGENT STANDBY
          </span>
        );
    }
  };

  const sampleGoals = [
    'Open YouTube and search for Techno Gamerz',
    'Open Google and search for React tutorials',
    'Research AI agent frameworks and compare them',
    'Remember that my project is called OREO',
    'Clear all stored memories',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#030914]/95 border border-cyan-500/30 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.2)] flex flex-col overflow-hidden text-white font-sans">
        {/* Header HUD */}
        <div className="px-6 py-4 border-b border-cyan-500/20 bg-cyan-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono tracking-wider text-white">
                  OREO AGENTIC ENGINE
                </h2>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-zinc-400">
                Autonomous multi-step planning, real tool execution, observation & verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Emergency Stop Button */}
            {(status === 'executing' || status === 'planning' || status === 'verifying' || status === 'retrying') && (
              <button
                onClick={handleStopAgent}
                id="btn-emergency-stop-agent"
                className="px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.4)] border border-rose-400/50 transition-all"
                title="Immediately halt all agent actions"
              >
                <StopCircle className="w-4 h-4" />
                STOP AGENT
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 flex items-center justify-between border-b border-white/5 bg-[#02050e]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-4 py-2 text-xs font-mono font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'plan'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Active Plan & Execution
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 text-xs font-mono font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Task History ({tasksHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('capabilities')}
              className={`px-4 py-2 text-xs font-mono font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'capabilities'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/40'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Capabilities & Discovery
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Goal Input Bar */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-black/50 border border-cyan-500/30 focus-within:border-cyan-400 shadow-inner">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartGoal()}
                placeholder="Give OREO a natural language goal (e.g., 'Open YouTube and search for Techno Gamerz')..."
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none px-2 py-1.5"
              />
              <button
                onClick={() => handleStartGoal()}
                disabled={!goalInput.trim()}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold font-mono transition-all flex items-center gap-1.5 shadow-md"
              >
                <Play className="w-3.5 h-3.5" />
                EXECUTE GOAL
              </button>
            </div>

            {/* Quick Sample Goals */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
                Quick Tasks:
              </span>
              {sampleGoals.map((g, i) => (
                <button
                  key={i}
                  onClick={() => handleStartGoal(g)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-[11px] text-zinc-300 hover:text-cyan-200 transition-colors"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: ACTIVE PLAN & EXECUTION */}
          {activeTab === 'plan' && (
            <div className="space-y-6">
              {/* Active Confirmation Dialog (When HIGH_RISK or CRITICAL action is pending) */}
              {currentTask?.activeConfirmation && (
                <div className="p-5 rounded-2xl bg-amber-950/40 border-2 border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 border border-amber-400/40">
                      <ShieldAlert className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30">
                          {currentTask.activeConfirmation.permissionLevel}
                        </span>
                        <h3 className="text-sm font-bold text-amber-200">
                          TASK REQUIRES CONFIRMATION
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-200 font-medium pt-1">
                        <strong className="text-amber-300 font-mono">Action:</strong> {currentTask.activeConfirmation.action}
                      </p>
                      <p className="text-xs text-zinc-300">
                        <strong className="text-amber-300 font-mono">Reason:</strong> {currentTask.activeConfirmation.reason}
                      </p>
                      <div className="flex items-center gap-3 pt-3">
                        <button
                          onClick={() => handleConfirm(currentTask.activeConfirmation!.stepId)}
                          className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono transition-all shadow-md"
                        >
                          CONFIRM ACTION
                        </button>
                        <button
                          onClick={() => handleReject(currentTask.activeConfirmation!.stepId)}
                          className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 text-xs font-mono transition-all"
                        >
                          CANCEL ACTION
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Goal Box */}
              {currentTask ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                          GOAL ({currentTask.intent})
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          ID: {currentTask.id.slice(0, 14)}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-white">
                        "{currentTask.goal}"
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {status === 'paused' ? (
                        <button
                          onClick={handleResume}
                          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Resume
                        </button>
                      ) : status === 'executing' ? (
                        <button
                          onClick={handlePause}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 text-xs font-mono flex items-center gap-1.5 transition-colors"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          Pause
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Plan Steps List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      Structured Action Plan ({currentTask.steps.length} Steps)
                    </h4>

                    <div className="space-y-2">
                      {currentTask.steps.map((step, idx) => {
                        const isCurrent = idx === currentTask.currentStepIndex && (status === 'executing' || status === 'verifying' || status === 'retrying');

                        return (
                          <div
                            key={step.id}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              step.status === 'completed'
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100'
                                : step.status === 'failed'
                                ? 'bg-rose-950/20 border-rose-500/30 text-rose-100'
                                : step.status === 'needs_confirmation'
                                ? 'bg-amber-950/20 border-amber-500/40 text-amber-100 animate-pulse'
                                : isCurrent
                                ? 'bg-cyan-950/30 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                                : 'bg-black/20 border-white/10 text-zinc-400'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 shrink-0">
                                  {step.status === 'completed' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : step.status === 'failed' ? (
                                    <AlertCircle className="w-4 h-4 text-rose-400" />
                                  ) : step.status === 'needs_confirmation' ? (
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                  ) : isCurrent ? (
                                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-zinc-600" />
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-zinc-300">
                                      Step {idx + 1}:
                                    </span>
                                    <span className="text-xs font-medium text-white">
                                      {step.description}
                                    </span>
                                    <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-white/5 border border-white/10 text-cyan-300">
                                      {step.tool}
                                    </span>
                                  </div>

                                  {/* Observation & Verification details */}
                                  {step.observation && (
                                    <p className="text-[11px] text-zinc-300 font-mono">
                                      <span className="text-cyan-400">Observed:</span> {step.observation.whatHappened}
                                    </p>
                                  )}
                                  {step.verification && (
                                    <p className="text-[11px] text-zinc-300 font-mono">
                                      <span className="text-emerald-400">Verified:</span> {step.verification.evidence}
                                    </p>
                                  )}
                                  {step.error && (
                                    <p className="text-[11px] text-rose-300 font-mono">
                                      <span className="text-rose-400">Error:</span> {step.error.message}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[10px] font-mono uppercase font-bold text-zinc-400">
                                  {step.status}
                                </span>
                                {step.attempts > 0 && (
                                  <span className="text-[9px] font-mono text-zinc-500">
                                    Attempts: {step.attempts}/{step.maxAttempts}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Final Result Summary (if finished) */}
                  {currentTask.finalResult && (
                    <div
                      className={`p-4 rounded-2xl border ${
                        currentTask.finalResult.success
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        {currentTask.finalResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                        )}
                        Final Agent Result
                      </h4>
                      <p className="text-sm font-medium">{currentTask.finalResult.summary}</p>
                      {currentTask.finalResult.warnings && currentTask.finalResult.warnings.length > 0 && (
                        <div className="mt-2 text-xs text-amber-300 space-y-1">
                          {currentTask.finalResult.warnings.map((w, i) => (
                            <p key={i}>⚠️ {w}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-500 space-y-3">
                  <Bot className="w-12 h-12 text-cyan-500/30 stroke-1" />
                  <p className="text-sm">No active agent task. Type a goal above to start the real agent loop.</p>
                </div>
              )}

              {/* Real-Time Event Stream Log */}
              {eventLog.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Live Activity Stream
                  </h4>
                  <div className="p-3 rounded-2xl bg-black/60 border border-white/5 font-mono text-xs text-zinc-300 space-y-1.5 max-h-36 overflow-y-auto">
                    {eventLog.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-2">
                        <span className="text-[10px] text-cyan-400 shrink-0">[{ev.time}]</span>
                        <span className="leading-tight">{ev.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TASK HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-bold">
                  Persistent Task Audit Trail
                </h4>
                {tasksHistory.length > 0 && (
                  <button
                    onClick={() => {
                      taskManager.clearHistory();
                      setTasksHistory([]);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-mono"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {tasksHistory.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  No previous agent tasks recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {tasksHistory.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                              {t.intent}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                              {new Date(t.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-white mt-1">"{t.goal}"</p>
                        </div>
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                            t.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : t.status === 'failed' || t.status === 'cancelled'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-cyan-500/20 text-cyan-300'
                          }`}
                        >
                          {t.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-400 font-mono pt-1">
                        Steps: {t.steps.filter((s) => s.status === 'completed').length}/{t.steps.length} completed
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CAPABILITIES & DISCOVERY */}
          {activeTab === 'capabilities' && (
            <div className="space-y-6">
              {/* Dual Runtime Telemetry Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/20 border border-cyan-500/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2.5 rounded-xl ${bridgeState.isElectron ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">
                          {bridgeState.isElectron ? 'Electron Native Desktop Layer' : 'Web Display Media & Native IPC Layer'}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {bridgeState.isElectron ? 'NATIVE IPC ACTIVE' : 'DUAL RUNTIME ONLINE'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Platform: <span className="text-zinc-200 font-mono">{bridgeState.platform || (typeof navigator !== 'undefined' ? navigator.platform : 'web')}</span> • Screen Streams: <span className="text-zinc-200 font-mono">{bridgeState.displays?.length || bridgeState.activeDisplayCount || 1} Display(s)</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCaptureScreen}
                      disabled={isCapturing}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{isCapturing ? 'Grabbing Frame...' : 'Capture Screen'}</span>
                    </button>

                    <button
                      onClick={handleToggleLiveStream}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                        bridgeState.isScreenSharingActive
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{bridgeState.isScreenSharingActive ? 'Stop Stream' : 'Live Stream'}</span>
                    </button>
                  </div>
                </div>

                {testFeedback && (
                  <div className="mt-3 p-2 rounded-xl bg-black/50 border border-cyan-500/20 text-xs font-mono text-cyan-200 flex items-center justify-between">
                    <span>{testFeedback}</span>
                    <button onClick={() => setTestFeedback(null)} className="text-zinc-500 hover:text-zinc-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Real Screen Awareness Frame Preview */}
              {bridgeState.lastScreenshot && (
                <div className="p-4 rounded-2xl bg-black/60 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                        Live Screen Awareness Frame ({bridgeState.lastScreenshot.width} × {bridgeState.lastScreenshot.height})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Captured: {new Date(bridgeState.lastScreenshot.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-video max-h-56 flex items-center justify-center group">
                    <img
                      src={bridgeState.lastScreenshot.dataUrl}
                      alt="Real Desktop Screen Frame"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="text-xs font-mono font-bold text-cyan-300 bg-black/80 px-3 py-1.5 rounded-lg border border-cyan-500/40">
                        Visual Perception Frame Buffer Registered
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Interactive Native Operations Toolbar */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-bold">
                    Native OS Control & Diagnostics Tools
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">IPC Dispatched</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={handleTestClick}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left space-y-1 transition-all"
                  >
                    <div className="flex items-center space-x-1.5 text-cyan-400 text-xs font-semibold">
                      <MousePointer className="w-3.5 h-3.5" />
                      <span>Click (500, 300)</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Dispatch mouse click</p>
                  </button>

                  <button
                    onClick={handleTestType}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left space-y-1 transition-all"
                  >
                    <div className="flex items-center space-x-1.5 text-blue-400 text-xs font-semibold">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Type Keystrokes</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Inject test keystrokes</p>
                  </button>

                  <button
                    onClick={handleReadClipboard}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left space-y-1 transition-all"
                  >
                    <div className="flex items-center space-x-1.5 text-purple-400 text-xs font-semibold">
                      <Copy className="w-3.5 h-3.5" />
                      <span>Read Clipboard</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Query clipboard text</p>
                  </button>

                  <button
                    onClick={handleGetSystemInfo}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left space-y-1 transition-all"
                  >
                    <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-semibold">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>OS Diagnostics</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Fetch system telemetry</p>
                  </button>
                </div>
              </div>

              {/* Capability Discovery Matrix */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-bold">
                  OREO Autonomous Capabilities Matrix
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Browser Navigation</span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">AVAILABLE ✓</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Real URL loading, Google / YouTube search, multiple tabs, and workspace display.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Long-Term Memory</span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">AVAILABLE ✓</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Fact indexing, selective query, project preferences, and persistent storage.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Web Research Synthesis</span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">AVAILABLE ✓</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Cross-source search and topical analysis in browser workspace.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">OREO App Workspace</span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">AVAILABLE ✓</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Launch, minimize, and control workspace apps.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Native Desktop Control</span>
                      <span className="text-xs font-mono text-cyan-400 font-bold">AVAILABLE ✓</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Real OS-level mouse clicking, cursor positioning, and keyboard typing via Electron native layer.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">OS-Level Screen Awareness</span>
                      <span className="text-xs font-mono text-cyan-400 font-bold">AVAILABLE ✓</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Real display frame grabbing, pixel resolution detection, and multi-display stream perception.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
