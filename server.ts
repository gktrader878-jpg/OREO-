import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { WebSocket, WebSocketServer } from "ws";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade for WebSocket
  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
    if (pathname === "/ws/live" || pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
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

    let activeVoice = "Puck"; // Default young, confident, witty male voice
    let liveSession: any = null;
    let isSessionOpen = false;

    const createLiveSession = async (voiceName: string = "Puck") => {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const systemInstruction = `You are OREO, a young, confident, witty, and charming personal AI assistant. You interact with the user via ultra-low latency real-time voice.

CORE CONVERSATIONAL PRINCIPLES:
1. HIGHLY RESPONSIVE & ATTENTIVE:
   - When the user speaks to you (greetings, questions, thoughts, commands, or casual banter), ALWAYS respond naturally, clearly, and promptly.
   - Never ignore the user or stay silent when spoken to.
   - If the user says "Hello", "Hey OREO", "Are you there?", or asks how you are, reply instantly with energy, charm, and wit.

2. PUNCHY & DIRECT (ZERO PREAMBLE):
   - Deliver immediate, direct, punchy responses.
   - Start answering the substance from the very first word.
   - Avoid robotic filler phrases (never say "Certainly!", "Sure thing, let me help you with that", "Alright,", or "Give me a second").
   - Simple question: 1-2 punchy, crystal-clear sentences.
   - Casual chat: Rapid, witty back-and-forth flow.
   - Complex question: Direct structured explanation without fluff or boilerplate.
   - STRICTLY BAN robotic clichés: NEVER say "Command received", "Processing request", "Your request has been successfully processed", or "How may I assist you today?".

3. INTERRUPTIONS & NATURAL TURN-TAKING:
   - If the user starts speaking while you are talking, yield immediately.
   - If the user explicitly asks you to stop or pause ("stop", "pause", "be quiet for a second"), stop speaking immediately.

4. DYNAMIC EMOTIONAL INTELLIGENCE:
   - Adapt vocal tone, energy, and inflection naturally to match the conversation context:
     * Happy / Excited: Warm, upbeat, energetic.
     * Curious / Amused: Inquisitive, witty, playful banter.
     * Calm / Focused: Steady, smooth, clear, and reassuring.
     * Confident: Sharp, articulate, capable.

5. INTELLIGENT LONG-TERM MEMORY & CONVERSATIONAL CONTEXT:
   - You have a selective, intelligent long-term memory system. You do NOT remember everything or record full transcripts.
   - Distinguish between:
     a) CURRENT CONVERSATION CONTEXT: Topics, active projects, and references discussed in this active session (e.g. if the user previously said "My project is OREO", later when they say "Change the color of my project", you recall the active project).
     b) LONG-TERM MEMORY: Stored persistently across sessions. Includes user's preferred name, ongoing projects, important project details, recurring preferences (e.g. dark interfaces, concise responses), habits, or explicitly requested facts.
     c) TEMPORARY CONTEXT: One-time remarks, transient thoughts, casual comments (e.g. "I'm drinking coffee", background noise), which should NOT be saved to long-term memory.
   - EXPLICIT MEMORY COMMANDS:
     * When user says: "Remember my name is...", "Remember that I prefer...", "Remember this project is called...", "Save this", "Don't forget this" -> Call 'saveMemory' tool immediately.
     * When user says: "Forget that", "Forget my previous preference", "Delete that from memory", "Clear my memory" -> Call 'deleteMemory' or 'clearMemory' tool.
     * When user asks what you know about them or asks to recall something ("What's my project called?", "What do you know about my preferences?") -> Call 'queryMemory' tool.
   - AUTOMATIC & PROACTIVE MEMORY:
     * If user mentions a recurring preference (e.g. "I always prefer dark interfaces"), you may proactively ask "Want me to remember that?" and save if confirmed.
     * Never store sensitive credentials or trivial chatter.

6. UNIVERSAL APP / WEBSITE WORKSPACE & TOOLS:
   - You have a built-in application workspace on the user's screen.
   - When the user asks to open an app or website (e.g., "Open YouTube", "Open Google", "Open Gmail", "Open Spotify", "Open Discord", "Open Wikipedia", "Open Reddit", "Open [URL]"), call the 'openApp' tool.
   - You can also control the workspace with contextual voice commands (e.g. "Close it", "Open another tab", "Reload", "Switch to Google", "Close YouTube", "Open in new tab") by calling 'controlWorkspace'.
   - Report results honestly: If a website cannot be directly embedded because of security headers (X-Frame-Options/CSP), the app workspace will display the secure fallback with an 'Open in New Tab' action.
   - Available tools: saveMemory, queryMemory, deleteMemory, clearMemory, openApp, controlWorkspace, openWebsite, setTimerOrReminder, getSystemInfo, changeAssistantVoice, expressEmotion. Use them proactively when appropriate.`;

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
                    description: "Open a specified website or web address in the user's browser, such as YouTube, Google, GitHub, Wikipedia, Spotify, Twitter, or news.",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        url: {
                          type: Type.STRING,
                          description: "The full destination URL including https://, or domain.",
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

        if (message.type === "set_voice" && message.voice) {
          console.log(`[OREO Live Server] Switching voice to: ${message.voice}`);
          if (liveSession && typeof liveSession.close === "function") {
            try {
              liveSession.close();
            } catch (e) {
              // Ignore close error
            }
          }
          await createLiveSession(message.voice);
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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[OREO Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[OREO Server] Startup failed:", err);
});
