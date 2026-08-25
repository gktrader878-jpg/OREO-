import { MemoryManager } from '../services/MemoryManager';
import { MemoryItem } from '../types';
import { AgentTaskContext } from './AgentTypes';

export class AgentMemory {
  private static instance: AgentMemory | null = null;
  private memoryManager: MemoryManager = MemoryManager.getInstance();

  public static getInstance(): AgentMemory {
    if (!AgentMemory.instance) {
      AgentMemory.instance = new AgentMemory();
    }
    return AgentMemory.instance;
  }

  /**
   * Retrieve ONLY relevant memories for a given goal or query string,
   * avoiding dumping the entire memory database into agent prompts.
   */
  public async getRelevantMemories(goal: string, maxItems: number = 6): Promise<string[]> {
    try {
      const allMemories = this.memoryManager.getAllMemories();
      if (!allMemories || allMemories.length === 0) {
        return [];
      }

      const keywords = goal
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2);

      // Score memories by relevance to keywords, importance, and recency
      const scored = allMemories.map((m) => {
        let score = (m.importance || 0.5) * 1.5;
        const text = `${m.key || ''} ${m.title || ''} ${m.content || ''} ${(m.tags || []).join(' ')}`.toLowerCase();

        for (const kw of keywords) {
          if (text.includes(kw)) {
            score += 3.0;
          }
        }

        // Project or identity memories have baseline relevance
        if (m.category === 'project' || m.category === 'identity' || m.category === 'preference') {
          score += 1.0;
        }

        return { memory: m, score };
      });

      scored.sort((a, b) => b.score - a.score);

      const top = scored
        .filter((s) => s.score > 1.2 || keywords.length === 0)
        .slice(0, maxItems)
        .map((s) => `[${s.memory.category.toUpperCase()}] ${s.memory.key ? s.memory.key + ': ' : ''}${s.memory.content}`);

      return top;
    } catch (err) {
      console.warn('[AgentMemory] Retrieval issue:', err);
      return [];
    }
  }

  /**
   * Build initial task context with relevant memories and environment details.
   */
  public async buildContext(goal: string): Promise<AgentTaskContext> {
    const relevantMemories = await this.getRelevantMemories(goal);

    return {
      relevantMemories,
      userPreferences: {},
      environmentInfo: {
        runtime: 'browser-web',
        hasMicrophone: true,
        hasAudioOutput: true,
        hasBrowserWorkspace: true,
        timestamp: Date.now(),
      },
      intermediateVariables: {},
    };
  }

  /**
   * Directly save a fact or observation to permanent OREO long-term memory.
   */
  public async recordMemory(params: {
    content: string;
    key?: string;
    category?: any;
    importance?: number;
  }): Promise<{ success: boolean; memoryId?: string }> {
    try {
      const res = this.memoryManager.saveMemory({
        content: params.content,
        key: params.key || 'Agent Observation',
        category: params.category || 'context',
        importance: params.importance || 0.7,
        isExplicit: false,
        source: 'automatic',
      });
      return { success: Boolean(res && res.id), memoryId: res?.id };
    } catch (e) {
      return { success: false };
    }
  }
}
