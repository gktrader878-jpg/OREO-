export type AssistantState = 'disconnected' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export type VoiceOption = 'Puck' | 'Fenrir' | 'Zephyr' | 'Charon';

export type ResponseSpeedMode = 'turbo' | 'balanced';

export type VisualizerMode = 'orb' | 'waveform' | 'cyberhud' | 'particles';

export type MemoryCategory =
  | 'identity'
  | 'preference'
  | 'project'
  | 'instruction'
  | 'habit'
  | 'context'
  | 'other';

export interface MemoryItem {
  id: string;
  key?: string; // Short title or identifier (e.g. "Project Name", "Theme Preference", "User Name")
  title?: string; // Alias for key/title
  category: MemoryCategory;
  content: string; // The factual memory content (e.g., "User's project is called OREO")
  importance: number; // 0.1 to 1.0 (e.g., 0.9 for project name, 0.7 for preference)
  isExplicit: boolean; // true if explicitly asked ("Remember that..."), false if auto-learned
  source?: 'explicit' | 'automatic';
  tags?: string[];
  createdAt: number | string;
  updatedAt: number | string;
  accessCount?: number;
  lastAccessedAt?: number;
}

export interface ConversationMemoryContext {
  currentTopic?: string;
  activeProjectName?: string;
  recentTopics: string[];
  sessionPreferences: Record<string, any>;
  temporaryContext: string[];
  lastUpdated: number;
}

export interface MemoryStats {
  totalCount: number;
  categoryCounts: Record<MemoryCategory, number>;
  highImportanceCount: number;
}

export type EmotionType =
  | 'happy'
  | 'excited'
  | 'curious'
  | 'amused'
  | 'calm'
  | 'confident'
  | 'concerned'
  | 'empathetic'
  | 'encouraging'
  | 'serious'
  | 'surprised'
  | 'thoughtful'
  | 'neutral';

export interface EmotionState {
  current: EmotionType;
  intensity: number; // 0.0 (neutral) to 1.0 (maximum)
  reason?: string;
  updatedAt: number;
}

export interface FunctionCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface FunctionResponse {
  id: string;
  name: string;
  response: {
    output: Record<string, any>;
  };
}

export interface ClientMessage {
  type: 'audio' | 'tool_response' | 'set_voice' | 'ping';
  data?: string; // Base64 PCM 16kHz audio
  responses?: FunctionResponse[];
  voice?: VoiceOption;
  timestamp?: number;
}

export interface ServerMessage {
  type: 'audio' | 'interrupted' | 'tool_call' | 'status' | 'error' | 'turn_complete' | 'pong' | 'emotion_update';
  data?: string; // Base64 PCM 24kHz audio
  calls?: FunctionCall[];
  status?: string;
  message?: string;
  timestamp?: number;
  emotion?: EmotionType;
  intensity?: number;
  reason?: string;
}

export interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  createdAt: number;
}

export interface ToolActionLog {
  id: string;
  toolName: string;
  args: Record<string, any>;
  result: Record<string, any>;
  timestamp: Date;
  status: 'executing' | 'success' | 'failed';
}

export interface OpenedWebsite {
  id: string;
  url: string;
  title: string;
  openedAt: Date;
}

export interface WorkspaceTab {
  id: string;
  appName: string;
  url: string;
  title: string;
  iconName?: string;
  favIconUrl?: string;
  isLoading: boolean;
  isEmbedBlocked?: boolean;
  openedAt: number;
}

export interface WorkspaceState {
  isOpen: boolean;
  isMinimized: boolean;
  isFullscreen: boolean;
  tabs: WorkspaceTab[];
  activeTabId: string | null;
}

export interface SessionTelemetry {
  latencyMs: number;
  bytesSent: number;
  bytesReceived: number;
  sessionDuration: number;
  userVolume: number;
  assistantVolume: number;
  currentVoice: VoiceOption;
  emotion: EmotionState;
  workspaceOpen?: boolean;
  responseSpeedMode?: ResponseSpeedMode;
}
