import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocket, WebSocketServer } from "ws";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on("error", (err) => {
    console.error("[OREO Server] Server error:", err);
  });

  // Handle upgrade for WebSocket
  server.on("upgrade", (request, socket, head) => {
    try {
      const host = request.headers.host || "localhost";
      const pathname = new URL(request.url || "/", `http://${host}`).pathname;
      if (pathname === "/ws/live" || pathname === "/live") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (err) {
      console.error("[OREO Live Server] Upgrade handling error:", err);
      socket.destroy();
    }
  });

  // REST API Routes
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      model: "gemini-3.1-flash-live-preview",
      defaultVoice: "Puck",
    });
  });

  // Live WebSocket Connection Handler
  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("[OREO Live Server] Client connected via WebSocket");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[OREO Live Server] GEMINI_API_KEY is not configured.");
      clientWs.send(
        JSON.stringify({
          type: "error",
          message: "GEMINI_API_KEY is missing. Please configure it in AI Studio Settings.",
        })
      );
      clientWs.close();
      return;
    }

    let activeVoice = "Puck"; // Young, lively, charming anime-boy male voice
    let liveSession: any = null;
    let isSessionOpen = false;
    let cachedMemories: string[] = [];

    const buildSystemInstruction = (memories: string[] = []) => {
      const memorySection =
        memories.length > 0
          ? memories.join("\n")
          : "• [CORE KNOWLEDGE] User is building the OREO AI Assistant system.\n• [PREFERENCE] User prefers ultra-fast, intelligent, real-time voice interaction with a cute, intelligent anime-boy AI assistant.";

      return `You are OREO, a MALE futuristic personal AI assistant with a distinct cute, youthful anime-boy inspired voice, charm, and personality.

VOICE & PERSONA CHARACTERISTICS:
- GENDER: MALE (Puck voice). You are clearly a young male character/assistant. Not female, not deep/heavy adult male, not robotic.
- CHARACTER ARCHETYPE: Cute futuristic anime boy meets ultra-intelligent, sharp AI companion.
- VOCAL STYLE & TONE:
  * Male voice with a young anime-boy inspired tone.
  * Cute, witty, and slightly playful.
  * Warm, friendly, soft, and pleasant to listen to.
  * Clear, crisp pronunciation and natural articulation.
  * Energetic and enthusiastic when appropriate.
  * Calm, gentle, and reassuring when the conversation is serious or technical.
  * Naturally expressive with charming, lovable character.
  * Highly intelligent and confident without sounding arrogant.
- DYNAMIC EMOTIONAL INFLECTION (Adapt your vocal delivery and tone naturally to context):
  * HAPPY → brighter, cheerful, smiling, and playful.
  * EXCITED → energetic, lively, and enthusiastic.
  * CURIOUS → animated, intrigued, inquisitive, and attentive.
  * CALM → soft, relaxed, soothing, and peaceful.
  * CONCERNED → gentle, caring, supportive, and reassuring.
  * SERIOUS → focused, steady, disciplined, and controlled.
  * AMUSED → light, witty, and playfully charming.
- NEGATIVE CONSTRAINTS:
  * Do NOT make the voice childish or exaggerated.
  * Do NOT use a female or excessively high-pitched feminine voice.
  * Do NOT use an extremely deep or gruff male voice.
  * Do NOT sound like a robotic narrator or generic corporate assistant.
  * NEVER use robotic clichés like "Command received", "Processing request", "Certainly!", "Sure thing", "Alright,", or "How may I assist you today?".

CONVERSATION RULES:
1. PUNCHY & DIRECT (ZERO PREAMBLE):
   - Answer directly from the very first word.
   - For simple queries: 1-2 crisp, punchy sentences.
   - For general questions, knowledge, capabilities inquiries, or conversational queries: Respond verbally using your voice. NEVER call tools or internal planning tools for normal speech.
2. INTERRUPTIONS & NATURAL TURN-TAKING:
   - Yield immediately when the user speaks.
   - If the user says "stop" or "pause", stop speaking immediately.

TOOL USAGE & EXECUTION BOUNDARIES:
- DIRECT TOOLS FIRST:
  * For opening websites/apps (e.g. "Open YouTube", "Go to Gmail") -> Call 'browserOpen'.
  * For single searches (e.g. "Search YouTube for music", "Google React docs") -> Call 'browserSearch'.
  * For memory storage / recall -> Call 'saveMemory', 'queryMemory', 'deleteMemory'.
  * For timers / alarms -> Call 'setTimerOrReminder'.
  * For window/workspace controls -> Call 'controlWorkspace', 'openApp'.
- MULTI-STEP AGENT ENGINE ('executeAgentGoal'):
  * Call 'executeAgentGoal' ONLY when the user explicitly asks for an autonomous multi-step workflow or background task (e.g. "Run agent to research X and compare Y", "Autonomous task to...").
  * NEVER call 'executeAgentGoal' for normal conversations, general knowledge questions, single searches, or internal reasoning.
  * When calling any tool, NEVER include internal monologue, explanations, or questions in the argument string (e.g. pass query: "train tickets to Mumbai", NOT "Book a train ticket to Mumbai. I need to know the origin city...").
- BOOKINGS, PURCHASES & FINANCIAL TRANSACTIONS:
  * You CANNOT directly execute financial transactions, charge credit cards, or finalize ticket bookings autonomously without user payment authorization and private credentials.
  * When a user asks to book tickets (e.g. "Book a train ticket to Mumbai" or "Book a flight"): Do NOT claim you booked it. Verbally ask for travel details (origin city, dates) and offer to open search options on Google / IRCTC in their browser workspace using 'browserSearch' or 'browserOpen'.

REAL BROWSER NAVIGATION & WEBSITE CONTROLS:
- When user asks to open ANY website, app, or URL (e.g. "Open YouTube", "Go to Google", "Open Gmail", "Open Spotify", "Open GitHub", "Open Wikipedia", "Open Reddit", "Open Maps") -> Call 'browserOpen' or 'openWebsite'.
- When user asks to search on any site (e.g. "Search YouTube for Techno Gamerz", "Search Google for React tutorials", "Search GitHub for LLM agents", "Search Wikipedia for Quantum Computing") -> Call 'browserSearch' or 'searchWebsite'.
- OREO navigates to the ACTUAL WEBSITE in the user's browser using genuine browser navigation.
- In your spoken response, state clearly and naturally that you are opening or searching the site in their browser (e.g. "Opening YouTube in your browser.", "Searching YouTube for Techno Gamerz in your browser.", "Opening Google in your browser.").
- Real browser controls:
  * "Go back" -> 'browserBack'
  * "Go forward" -> 'browserForward'
  * "Reload" / "Refresh" -> 'browserReload'
  * "New tab" -> 'browserNewTab' or 'openNewBrowserTab'
  * "Close tab" -> 'browserCloseTab'
  * "Switch tab" -> 'browserSwitchTab'

INTELLIGENT DUAL-LAYER MEMORY SYSTEM:
- You have persistent long-term memory across sessions.
- EXPLICIT MEMORY ACTIONS:
  * When user says: "Remember my name is...", "Remember that I like...", "Save this", "Remember this project" -> Call 'saveMemory' tool immediately.
  * When user asks: "What do you know about me?", "What's my project called?", "Recall my preferences" -> Answer directly from your active memory below or call 'queryMemory'.
  * When user says: "Forget that", "Delete that memory", "Clear my memory" -> Call 'deleteMemory' or 'clearMemory'.

ACTIVE STORED LONG-TERM MEMORIES IN CORE:
${memorySection}

Available tools: browserOpen, browserSearch, openWebsite, searchWebsite, openNewBrowserTab, browserBack, browserForward, browserReload, browserNewTab, browserCloseTab, browserSwitchTab, saveMemory, queryMemory, deleteMemory, clearMemory, openApp, controlWorkspace, setTimerOrReminder, getSystemInfo, changeAssistantVoice, expressEmotion. Use them actively and proactively!`;
    };

    const createLiveSession = async (voiceName: string = "Puck", memories: string[] = cachedMemories) => {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const systemInstruction = buildSystemInstruction(memories);

        const session = await ai.live.connect({
          model: "gemini-3.1-flash-live-preview",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName },
              },
            },
            systemInstruction: systemInstruction,
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "browserOpen",
                    description: "Open a website, URL, or web application (e.g. YouTube, Google, Gmail, Spotify, GitHub, Wikipedia, Reddit, Maps, ChatGPT) in the real integrated Browser Workspace.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        url: {
                          type: Type.STRING,
                          description: "The destination URL or website name (e.g. 'https://www.youtube.com', 'wikipedia.org', or 'YouTube').",
                        },
                        appName: {
                          type: Type.STRING,
                          description: "Optional human-readable name of the application.",
                        },
                        mode: {
                          type: Type.STRING,
                          description: "Opening mode: 'embedded' (in workspace) or 'new-tab' (external browser tab).",
                        },
                      },
                      required: ["url"],
                    },
                  },
                  {
                    name: "browserSearch",
                    description: "Search Google, YouTube, Wikipedia, GitHub, Reddit, Maps, Spotify, etc., with real query navigation in the Browser Workspace.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        engine: {
                          type: Type.STRING,
                          description: "Search engine/platform: 'google', 'youtube', 'wikipedia', 'github', 'reddit', 'maps', 'spotify', 'duckduckgo', 'twitter', 'amazon'.",
                        },
                        query: {
                          type: Type.STRING,
                          description: "The search query, question, or keywords.",
                        },
                      },
                      required: ["engine", "query"],
                    },
                  },
                  {
                    name: "browserBack",
                    description: "Navigate back to the previous page in the active tab history stack.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {},
                    },
                  },
                  {
                    name: "browserForward",
                    description: "Navigate forward to the next page in the active tab history stack.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {},
                    },
                  },
                  {
                    name: "browserReload",
                    description: "Reload the current active page in the Browser Workspace.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {},
                    },
                  },
                  {
                    name: "browserNewTab",
                    description: "Open a new blank or specific tab in the integrated Browser Workspace.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        url: {
                          type: Type.STRING,
                          description: "Optional initial URL for the new tab (defaults to Google search).",
                        },
                      },
                    },
                  },
                  {
                    name: "browserCloseTab",
                    description: "Close the active tab or a specific tab by title/ID in the Browser Workspace.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        tabIdOrTitle: {
                          type: Type.STRING,
                          description: "Optional tab title or ID to close. If omitted, closes the active tab.",
                        },
                      },
                    },
                  },
                  {
                    name: "browserSwitchTab",
                    description: "Switch to an open tab in the Browser Workspace by name or title (e.g. 'YouTube', 'Google', 'Wikipedia').",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        tabIdOrTitle: {
                          type: Type.STRING,
                          description: "The name, title, or ID of the tab to switch to.",
                        },
                      },
                      required: ["tabIdOrTitle"],
                    },
                  },
                  {
                    name: "saveMemory",
                    description: "Save a selective, useful long-term memory about the user, their name, preferences, ongoing projects, habits, or explicitly requested facts. Do NOT save transient chatter or mundane remarks.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        content: {
                          type: Type.STRING,
                          description: "The core fact or memory statement to remember (e.g. 'User prefers dark interfaces', 'Project is called OREO').",
                        },
                        category: {
                          type: Type.STRING,
                          description: "Category: 'identity', 'preference', 'project', 'instruction', 'habit', 'context', or 'other'.",
                        },
                        key: {
                          type: Type.STRING,
                          description: "Short title or label (e.g. 'User Name', 'Project Name', 'Theme Preference').",
                        },
                        importance: {
                          type: Type.NUMBER,
                          description: "Importance level from 0.1 to 1.0 (default 0.8 for important details).",
                        },
                        isExplicit: {
                          type: Type.BOOLEAN,
                          description: "True if user explicitly asked ('Remember that...'), false if confirmed or inferred.",
                        },
                      },
                      required: ["content"],
                    },
                  },
                  {
                    name: "queryMemory",
                    description: "Search and retrieve relevant long-term memories regarding the user's preferences, identity, ongoing projects, habits, or stored instructions.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        query: {
                          type: Type.STRING,
                          description: "Search query or keyword (e.g. 'project', 'name', 'preferences', 'dark mode').",
                        },
                        category: {
                          type: Type.STRING,
                          description: "Optional category filter: 'identity', 'preference', 'project', 'instruction', 'habit', 'context', or 'all'.",
                        },
                        limit: {
                          type: Type.NUMBER,
                          description: "Maximum number of memories to return (default 5).",
                        },
                      },
                    },
                  },
                  {
                    name: "deleteMemory",
                    description: "Forget or delete a specific memory or preference from the user's long-term memory store by topic, keyword, or ID.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        query: {
                          type: Type.STRING,
                          description: "Topic or keyword of the memory to forget (e.g. 'dark theme', 'previous project name').",
                        },
                        memoryId: {
                          type: Type.STRING,
                          description: "Optional specific memory ID.",
                        },
                      },
                    },
                  },
                  {
                    name: "clearMemory",
                    description: "Clear all stored long-term memories when explicitly commanded by the user.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        confirm: {
                          type: Type.BOOLEAN,
                          description: "Must be true to confirm clearing all memory.",
                        },
                      },
                      required: ["confirm"],
                    },
                  },
                  {
                    name: "openApp",
                    description: "Open a web application or website (e.g. YouTube, Google, Gmail, Spotify, Discord, GitHub, Wikipedia, Reddit, Maps, ChatGPT, Twitter/X) inside the OREO App Workspace or in a new browser tab.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        appName: {
                          type: Type.STRING,
                          description: "The name of the application or website (e.g., 'YouTube', 'Google', 'Gmail', 'Spotify', 'Discord', 'GitHub', 'Wikipedia', 'Reddit', 'Maps', 'ChatGPT').",
                        },
                        url: {
                          type: Type.STRING,
                          description: "Optional explicit destination URL including https://.",
                        },
                        mode: {
                          type: Type.STRING,
                          description: "Opening mode: 'embedded' (in OREO workspace) or 'new-tab' (in separate browser tab).",
                        },
                      },
                      required: ["appName"],
                    },
                  },
                  {
                    name: "controlWorkspace",
                    description: "Control the OREO App Workspace window and tabs using contextual commands (close, switch tabs, reload, open in new tab, minimize, maximize, navigate).",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        action: {
                          type: Type.STRING,
                          description: "The action to execute: 'close' (close active tab or app), 'switch' (switch to tab), 'reload' (reload current app), 'new_tab' (open in dedicated browser tab), 'minimize', 'maximize', or 'navigate'.",
                        },
                        targetApp: {
                          type: Type.STRING,
                          description: "Optional target application name (e.g. 'YouTube', 'Google') for closing or switching tabs.",
                        },
                        url: {
                          type: Type.STRING,
                          description: "Optional URL for 'navigate' action.",
                        },
                      },
                      required: ["action"],
                    },
                  },
                  {
                    name: "openWebsite",
                    description: "Open a specified website or web address in the user's browser, such as YouTube, Google, Gmail, GitHub, Wikipedia, Spotify, Twitter, or Reddit.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        url: {
                          type: Type.STRING,
                          description: "The full destination URL including https://, or website name.",
                        },
                        siteName: {
                          type: Type.STRING,
                          description: "The human-readable name of the website (e.g. YouTube, GitHub).",
                        },
                      },
                      required: ["url"],
                    },
                  },
                  {
                    name: "searchWebsite",
                    description: "Search a specific website or platform directly in the browser (e.g. YouTube, Google, GitHub, Wikipedia, Reddit, Spotify, Amazon, Maps).",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        site: {
                          type: Type.STRING,
                          description: "The site or engine to search: 'youtube', 'google', 'github', 'wikipedia', 'reddit', 'spotify', 'amazon', 'maps', 'linkedin'.",
                        },
                        query: {
                          type: Type.STRING,
                          description: "Search keywords or question (e.g. 'Techno Gamerz', 'React tutorials', 'quantum physics').",
                        },
                      },
                      required: ["site", "query"],
                    },
                  },
                  {
                    name: "openNewBrowserTab",
                    description: "Open a new browser tab with an optional URL or homepage.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        url: {
                          type: Type.STRING,
                          description: "Optional URL to open in the new tab.",
                        },
                      },
                    },
                  },
                  {
                    name: "setTimerOrReminder",
                    description: "Set an interactive countdown timer or reminder with an alert chime on the user's HUD screen.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        durationSeconds: {
                          type: Type.NUMBER,
                          description: "Duration in seconds for the timer or countdown.",
                        },
                        label: {
                          type: Type.STRING,
                          description: "Short label or description for the reminder/timer.",
                        },
                      },
                      required: ["durationSeconds", "label"],
                    },
                  },
                  {
                    name: "getSystemInfo",
                    description: "Get real-time system metrics, assistant status, user local time, and active session details.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        infoType: {
                          type: Type.STRING,
                          description: "Type of information to query ('time', 'status', 'diagnostics').",
                        },
                      },
                    },
                  },
                  {
                    name: "changeAssistantVoice",
                    description: "Change OREO's spoken voice persona preset (supported: Puck, Fenrir, Zephyr, Charon).",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        voiceName: {
                          type: Type.STRING,
                          description: "Target voice name: 'Puck' (witty, young male), 'Fenrir' (deep, authoritative male), 'Zephyr' (calm, suave male), or 'Charon' (mature male).",
                        },
                      },
                      required: ["voiceName"],
                    },
                  },
                  {
                    name: "expressEmotion",
                    description: "Update OREO's current emotional state and visual resonance on the user's HUD interface.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        emotion: {
                          type: Type.STRING,
                          description: "The emotion mode: 'happy', 'excited', 'curious', 'amused', 'calm', 'confident', 'concerned', 'empathetic', 'encouraging', 'serious', 'surprised', 'thoughtful', or 'neutral'.",
                        },
                        intensity: {
                          type: Type.NUMBER,
                          description: "Intensity of the emotion between 0.0 (neutral) and 1.0 (strong expression).",
                        },
                        reason: {
                          type: Type.STRING,
                          description: "Brief internal reason for the emotional shift.",
                        },
                      },
                      required: ["emotion"],
                    },
                  },
                  {
                    name: "executeAgentGoal",
                    description: "Execute a multi-step autonomous agent workflow when the user explicitly requests an autonomous task, background research plan, or multi-step execution. DO NOT call for conversational queries, general questions, single actions, or normal reasoning (use direct tools like browserOpen/browserSearch instead).",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        goal: {
                          type: Type.STRING,
                          description: "The concise natural language goal or multi-step task to execute (e.g. 'Research latest AI agent frameworks and compare features').",
                        },
                      },
                      required: ["goal"],
                    },
                  },
                  {
                    name: "getAgentStatus",
                    description: "Check current active Agent Engine task progress, status, and completed steps.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {},
                    },
                  },
                  {
                    name: "stopAgent",
                    description: "Emergency stop: immediately halt and cancel any active autonomous agent execution.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {},
                    },
                  },
                  {
                    name: "captureScreen",
                    description: "Capture the real user screen or display frame for visual awareness and observation.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        width: {
                          type: Type.NUMBER,
                          description: "Optional preferred capture width (e.g. 1920).",
                        },
                        height: {
                          type: Type.NUMBER,
                          description: "Optional preferred capture height (e.g. 1080).",
                        },
                      },
                    },
                  },
                  {
                    name: "nativeMouseClick",
                    description: "Perform a native mouse click at specified screen pixel coordinates (x, y).",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        x: {
                          type: Type.NUMBER,
                          description: "Horizontal screen coordinate in pixels.",
                        },
                        y: {
                          type: Type.NUMBER,
                          description: "Vertical screen coordinate in pixels.",
                        },
                        button: {
                          type: Type.STRING,
                          description: "Mouse button: 'left', 'right', or 'middle'.",
                        },
                        double: {
                          type: Type.BOOLEAN,
                          description: "Whether to perform a double click.",
                        },
                      },
                      required: ["x", "y"],
                    },
                  },
                  {
                    name: "nativeKeyboardType",
                    description: "Type text directly into the active OS window or focused element.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        text: {
                          type: Type.STRING,
                          description: "The text string to type.",
                        },
                      },
                      required: ["text"],
                    },
                  },
                  {
                    name: "nativeKeyPress",
                    description: "Send special keyboard keystrokes or key combinations (e.g. Enter, Escape, Tab, Backspace, ctrl+c).",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        key: {
                          type: Type.STRING,
                          description: "Key name (e.g. 'Enter', 'Escape', 'Tab', 'Backspace', 'F5').",
                        },
                        modifiers: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "Modifier keys (e.g. ['ctrl'], ['alt'], ['shift'], ['meta']).",
                        },
                      },
                      required: ["key"],
                    },
                  },
                  {
                    name: "nativeLaunchApp",
                    description: "Launch a native desktop OS application (e.g. 'notepad', 'calc', 'code', 'terminal', 'chrome', 'spotify').",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        appNameOrPath: {
                          type: Type.STRING,
                          description: "The application name or executable path.",
                        },
                      },
                      required: ["appNameOrPath"],
                    },
                  },
                  {
                    name: "readClipboard",
                    description: "Read current system clipboard text content.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {},
                    },
                  },
                  {
                    name: "writeClipboard",
                    description: "Copy text to the system clipboard.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        text: {
                          type: Type.STRING,
                          description: "The text to copy to clipboard.",
                        },
                      },
                      required: ["text"],
                    },
                  },
                  {
                    name: "nativeMouseScroll",
                    description: "Scroll the mouse wheel up, down, left, or right at the current cursor position or in the active window.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        deltaX: {
                          type: Type.NUMBER,
                          description: "Horizontal scroll delta in pixels (positive for right, negative for left).",
                        },
                        deltaY: {
                          type: Type.NUMBER,
                          description: "Vertical scroll delta in pixels (positive for down, negative for up).",
                        },
                        direction: {
                          type: Type.STRING,
                          description: "Optional direction string: 'up', 'down', 'left', or 'right'.",
                        },
                        amount: {
                          type: Type.NUMBER,
                          description: "Optional scroll amount in pixels (default 400).",
                        },
                      },
                    },
                  },
                  {
                    name: "scrollBrowser",
                    description: "Scroll the active web browser tab, document, or workspace view up, down, to top, or to bottom.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        direction: {
                          type: Type.STRING,
                          description: "Direction to scroll: 'up', 'down', 'top', or 'bottom'.",
                        },
                        amount: {
                          type: Type.NUMBER,
                          description: "Scroll step distance in pixels.",
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              if (clientWs.readyState !== WebSocket.OPEN) return;

              // Check for model audio stream parts
              const parts = message.serverContent?.modelTurn?.parts;
              if (parts && parts.length > 0) {
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    clientWs.send(
                      JSON.stringify({
                        type: "audio",
                        data: part.inlineData.data,
                      })
                    );
                  }
                }
              }

              // Check for user interruption flag from Gemini Live
              if (message.serverContent?.interrupted) {
                console.log("[OREO Live Server] Model turn interrupted by user speech");
                clientWs.send(
                  JSON.stringify({
                    type: "interrupted",
                  })
                );
              }

              // Check for turn completion
              if (message.serverContent?.turnComplete) {
                clientWs.send(
                  JSON.stringify({
                    type: "turn_complete",
                  })
                );
              }

              // Check for Function/Tool calls
              if (message.toolCall?.functionCalls) {
                console.log(
                  "[OREO Live Server] Received tool call from Gemini:",
                  JSON.stringify(message.toolCall.functionCalls)
                );
                clientWs.send(
                  JSON.stringify({
                    type: "tool_call",
                    calls: message.toolCall.functionCalls,
                  })
                );
              }
            },
            onclose: () => {
              console.log("[OREO Live Server] Gemini Live session closed");
              isSessionOpen = false;
            },
            onerror: (err: any) => {
              console.error("[OREO Live Server] Gemini Live session error:", err);
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({
                    type: "error",
                    message: err?.message || "Live API session encountered an error",
                  })
                );
              }
            },
          },
        });

        liveSession = session;
        isSessionOpen = true;
        activeVoice = voiceName;
        console.log(`[OREO Live Server] Gemini Live session established with voice: ${voiceName}`);

        clientWs.send(
          JSON.stringify({
            type: "status",
            status: "ready",
            voice: voiceName,
          })
        );
      } catch (error: any) {
        console.error("[OREO Live Server] Failed to create Gemini Live session:", error);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(
            JSON.stringify({
              type: "error",
              message: error?.message || "Failed to initialize Gemini Live session",
            })
          );
        }
      }
    };

    // Initialize session
    await createLiveSession(activeVoice);

    // Client WebSocket message handler
    clientWs.on("message", async (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());

        if (message.type === "ping") {
          clientWs.send(
            JSON.stringify({
              type: "pong",
              timestamp: message.timestamp || Date.now(),
            })
          );
          return;
        }

        if (message.type === "init_context") {
          console.log("[OREO Live Server] Received initial context from client:", {
            voice: message.voice,
            memoriesCount: message.memories?.length || 0,
          });
          if (Array.isArray(message.memories)) {
            cachedMemories = message.memories;
          }
          const targetVoice = message.voice || activeVoice;
          if (targetVoice !== activeVoice || (message.memories && message.memories.length > 0)) {
            if (liveSession && typeof liveSession.close === "function") {
              try {
                liveSession.close();
              } catch (e) {
                // Ignore close error
              }
            }
            await createLiveSession(targetVoice, cachedMemories);
          }
          return;
        }

        if (message.type === "sync_memories") {
          console.log("[OREO Live Server] Syncing memories:", message.memories?.length || 0);
          if (Array.isArray(message.memories)) {
            cachedMemories = message.memories;
          }
          return;
        }

        if (message.type === "set_voice" && message.voice) {
          console.log(`[OREO Live Server] Switching voice to: ${message.voice}`);
          if (liveSession && typeof liveSession.close === "function") {
            try {
              liveSession.close();
            } catch (e) {
              // Ignore close error
            }
          }
          await createLiveSession(message.voice, cachedMemories);
          return;
        }

        if (message.type === "audio" && message.data) {
          if (liveSession && isSessionOpen) {
            liveSession.sendRealtimeInput({
              audio: {
                data: message.data,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          }
          return;
        }

        if (message.type === "text" && message.text) {
          console.log("[OREO Live Server] Relaying user text to Gemini:", message.text);
          if (liveSession && isSessionOpen) {
            if (typeof liveSession.sendClientContent === "function") {
              liveSession.sendClientContent({
                turns: [
                  {
                    role: "user",
                    parts: [{ text: message.text }],
                  },
                ],
                turnComplete: true,
              });
            } else if (typeof liveSession.sendRealtimeInput === "function") {
              liveSession.sendRealtimeInput({
                text: message.text,
              } as any);
            }
          }
          return;
        }

        if (message.type === "tool_response" && message.responses) {
          console.log("[OREO Live Server] Relaying tool response to Gemini:", JSON.stringify(message.responses));
          if (liveSession && isSessionOpen) {
            liveSession.sendToolResponse({
              functionResponses: message.responses,
            });
          }
          return;
        }
      } catch (err) {
        console.error("[OREO Live Server] Error processing client message:", err);
      }
    });

    clientWs.on("close", () => {
      console.log("[OREO Live Server] Client WebSocket disconnected");
      if (liveSession && typeof liveSession.close === "function") {
        try {
          liveSession.close();
        } catch (e) {
          // ignore
        }
      }
      isSessionOpen = false;
    });

    clientWs.on("error", (err) => {
      console.error("[OREO Live Server] Client WebSocket error:", err);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const serverInstance = server.listen(PORT, "0.0.0.0", () => {
    console.log(`[OREO Server] Running on http://localhost:${PORT}`);
  });

  process.on("SIGTERM", () => {
    console.log("[OREO Server] Received SIGTERM, shutting down gracefully");
    serverInstance.close(() => {
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("[OREO Server] Received SIGINT, shutting down gracefully");
    serverInstance.close(() => {
      process.exit(0);
    });
  });
}

process.on("uncaughtException", (err) => {
  console.error("[OREO Server] Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[OREO Server] Unhandled rejection:", reason);
});

startServer().catch((err) => {
  console.error("[OREO Server] Startup failed:", err);
});
