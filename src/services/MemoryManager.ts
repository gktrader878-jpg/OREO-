import { ConversationMemoryContext, MemoryCategory, MemoryItem, MemoryStats } from '../types';

export type MemoryEventListener = (event: {
  type: 'memory_added' | 'memory_updated' | 'memory_deleted' | 'memory_cleared';
  data?: any;
}) => void;

export interface MemoryDebugInfo {
  storage: string;
  key: string;
  databaseName: string;
  storeName: string;
  isIndexedDbSupported: boolean;
  isDbConnected: boolean;
  totalMemoriesCount: number;
  lastOperation: 'SAVE' | 'SEARCH' | 'UPDATE' | 'DELETE' | 'CLEAR' | 'INIT';
  lastResult: 'SUCCESS' | 'FAILED';
  lastMemoryId: string | null;
  lastError: string | null;
  lastTimestamp: number;
}

const STORAGE_KEY = 'OREO_MEMORIES';
const OLD_FALLBACK_KEY = 'oreo_longterm_memories_fallback';

export class MemoryManager {
  private static instance: MemoryManager | null = null;
  private listeners: Set<MemoryEventListener> = new Set();

  private debugInfo: MemoryDebugInfo = {
    storage: 'localStorage',
    key: STORAGE_KEY,
    databaseName: 'localStorage (OREO_MEMORIES)',
    storeName: STORAGE_KEY,
    isIndexedDbSupported: false,
    isDbConnected: true,
    totalMemoriesCount: 0,
    lastOperation: 'INIT',
    lastResult: 'SUCCESS',
    lastMemoryId: null,
    lastError: null,
    lastTimestamp: Date.now(),
  };

  // Short-term conversation context (active session only)
  private conversationContext: ConversationMemoryContext = {
    currentTopic: 'OREO AI Assistant Interaction',
    activeProjectName: 'OREO',
    recentTopics: [],
    sessionPreferences: {},
    temporaryContext: [],
    lastUpdated: Date.now(),
  };

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  constructor() {
    this.migrateOldStorageIfNeeded();
    this.updateStatsDebug('INIT', 'SUCCESS');
  }

  private migrateOldStorageIfNeeded(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (!current) {
        const old = localStorage.getItem(OLD_FALLBACK_KEY);
        if (old) {
          try {
            const parsed = JSON.parse(old);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            }
          } catch {
            // Ignore parse error
          }
        }
      }
    } catch (e) {
      console.warn('[OREO Memory] Storage migration notice:', e);
    }
  }

  /**
   * Safe synchronous reader of all memories from localStorage.
   */
  public getAllMemories(): MemoryItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (err) {
      console.error('[OREO Memory] Error parsing OREO_MEMORIES from localStorage:', err);
      return [];
    }
  }

  /**
   * Compatibility init method (instantaneous, never hangs).
   */
  public async init(): Promise<void> {
    this.migrateOldStorageIfNeeded();
    return Promise.resolve();
  }

  /**
   * Fetch a single memory by ID.
   */
  public getMemory(id: string): MemoryItem | null {
    const memories = this.getAllMemories();
    return memories.find((m) => m.id === id) || null;
  }

  /**
   * Save a new memory or replace an existing memory in localStorage.
   * Synchronously writes to localStorage and verifies existence.
   */
  public saveMemory(memoryData: Partial<MemoryItem> & { content: string }): MemoryItem {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment.');
    }

    const content = (memoryData.content || '').trim();
    if (!content) {
      throw new Error('Memory content is required.');
    }

    const now = new Date().toISOString();
    const id = memoryData.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const title = memoryData.title || memoryData.key || '';
    const isExplicit = memoryData.isExplicit !== undefined ? memoryData.isExplicit : (memoryData.source !== 'automatic');
    const source = memoryData.source || (isExplicit ? 'explicit' : 'automatic');

    const memoryItem: MemoryItem = {
      id,
      key: title,
      title: title,
      content,
      category: memoryData.category || 'preference',
      importance: typeof memoryData.importance === 'number' ? memoryData.importance : 0.8,
      isExplicit,
      source,
      tags: Array.isArray(memoryData.tags) ? memoryData.tags : [],
      createdAt: memoryData.createdAt || now,
      updatedAt: now,
      accessCount: (memoryData.accessCount || 0) + 1,
      lastAccessedAt: Date.now(),
    };

    try {
      const memories = this.getAllMemories();
      const existingIndex = memories.findIndex((m) => m.id === id);

      if (existingIndex >= 0) {
        memories[existingIndex] = {
          ...memories[existingIndex],
          ...memoryItem,
          createdAt: memories[existingIndex].createdAt || memoryItem.createdAt,
        };
      } else {
        memories.unshift(memoryItem);
      }

      // Step 4: JSON.stringify and save
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));

      // Step 6 & 7: Read back and verify saved ID exists
      const verifiedList = this.getAllMemories();
      const verified = verifiedList.some((m) => m.id === id);

      if (!verified) {
        throw new Error('Memory verification failed: record was not found after saving.');
      }

      this.updateStatsDebug('SAVE', 'SUCCESS', id);
      this.notifyListeners({ type: 'memory_added', data: memoryItem });

      return memoryItem;
    } catch (err: any) {
      this.updateStatsDebug('SAVE', 'FAILED', id, err?.message || 'Save error');
      console.error('[OREO Memory] Save failed:', err);
      throw err;
    }
  }

  /**
   * Alias for saveMemory to maintain compatibility with existing callers.
   */
  public async addMemory(memoryData: Partial<MemoryItem> & { content: string }): Promise<MemoryItem> {
    return this.saveMemory(memoryData);
  }

  /**
   * Update an existing memory item.
   */
  public updateMemory(id: string, updates: Partial<MemoryItem>): MemoryItem | null {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available.');
    }

    try {
      const memories = this.getAllMemories();
      const index = memories.findIndex((m) => m.id === id);

      if (index === -1) {
        this.updateStatsDebug('UPDATE', 'FAILED', id, 'Memory not found');
        return null;
      }

      const existing = memories[index];
      const now = new Date().toISOString();

      const updatedItem: MemoryItem = {
        ...existing,
        ...updates,
        id: existing.id,
        key: updates.title !== undefined ? updates.title : (updates.key !== undefined ? updates.key : existing.key),
        title: updates.title !== undefined ? updates.title : (updates.key !== undefined ? updates.key : existing.title),
        content: (updates.content !== undefined ? updates.content : existing.content).trim(),
        category: updates.category || existing.category,
        importance: updates.importance !== undefined ? updates.importance : existing.importance,
        isExplicit: updates.isExplicit !== undefined ? updates.isExplicit : existing.isExplicit,
        tags: updates.tags || existing.tags || [],
        updatedAt: now,
        lastAccessedAt: Date.now(),
      };

      memories[index] = updatedItem;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));

      // Verification
      const verifiedList = this.getAllMemories();
      const verified = verifiedList.find((m) => m.id === id);

      if (!verified || verified.updatedAt !== now) {
        throw new Error('Verification failed after memory update.');
      }

      this.updateStatsDebug('UPDATE', 'SUCCESS', id);
      this.notifyListeners({ type: 'memory_updated', data: updatedItem });

      return updatedItem;
    } catch (err: any) {
      this.updateStatsDebug('UPDATE', 'FAILED', id, err?.message || 'Update error');
      console.error('[OREO Memory] Update failed:', err);
      throw err;
    }
  }

  /**
   * Delete a memory by ID.
   */
  public deleteMemory(id: string): boolean {
    if (typeof localStorage === 'undefined') return false;

    try {
      const memories = this.getAllMemories();
      const initialLength = memories.length;
      const filtered = memories.filter((m) => m.id !== id);

      if (filtered.length === initialLength) {
        return false;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      // Verification
      const verified = this.getAllMemories().every((m) => m.id !== id);
      if (!verified) {
        throw new Error('Memory deletion verification failed.');
      }

      this.updateStatsDebug('DELETE', 'SUCCESS', id);
      this.notifyListeners({ type: 'memory_deleted', data: { id } });

      return true;
    } catch (err: any) {
      this.updateStatsDebug('DELETE', 'FAILED', id, err?.message || 'Delete error');
      console.error('[OREO Memory] Delete failed:', err);
      return false;
    }
  }

  /**
   * Clear all memories from storage.
   */
  public clearAllMemories(): boolean {
    if (typeof localStorage === 'undefined') return false;

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(OLD_FALLBACK_KEY);

      const verified = localStorage.getItem(STORAGE_KEY) === null;
      if (!verified) {
        throw new Error('Verification failed: memories still present.');
      }

      this.updateStatsDebug('CLEAR', 'SUCCESS');
      this.notifyListeners({ type: 'memory_cleared' });

      return true;
    } catch (err: any) {
      this.updateStatsDebug('CLEAR', 'FAILED', null, err?.message || 'Clear error');
      console.error('[OREO Memory] Clear failed:', err);
      return false;
    }
  }

  /**
   * Alias for clearAllMemories.
   */
  public async clearMemory(): Promise<boolean> {
    return this.clearAllMemories();
  }

  /**
   * Search memories matching a query string across title, key, content, category, and tags.
   */
  public searchMemories(query: string, category?: string): MemoryItem[] {
    const rawMemories = this.getAllMemories();
    const cleanQuery = (query || '').trim().toLowerCase();

    this.updateStatsDebug('SEARCH', 'SUCCESS');

    if (!cleanQuery) {
      if (category && category !== 'all') {
        return rawMemories.filter((m) => m.category === category);
      }
      return rawMemories;
    }

    const filtered = rawMemories.filter((m) => {
      if (category && category !== 'all' && m.category !== category) {
        return false;
      }

      const matchContent = m.content.toLowerCase().includes(cleanQuery);
      const matchKey = (m.key || '').toLowerCase().includes(cleanQuery);
      const matchTitle = (m.title || '').toLowerCase().includes(cleanQuery);
      const matchCategory = m.category.toLowerCase().includes(cleanQuery);
      const matchTags = m.tags?.some((t) => t.toLowerCase().includes(cleanQuery)) || false;

      return matchContent || matchKey || matchTitle || matchCategory || matchTags;
    });

    return filtered;
  }

  /**
   * Alias for searchMemories.
   */
  public async searchMemory(query: string, category?: string): Promise<MemoryItem[]> {
    return this.searchMemories(query, category);
  }

  /**
   * Find only the most relevant memories for an assistant query, ranked by relevance.
   */
  public findRelevantMemories(query: string, limit: number = 5): MemoryItem[] {
    const cleanQuery = (query || '').trim().toLowerCase();
    if (!cleanQuery) return [];

    const memories = this.getAllMemories();
    const keywords = cleanQuery.split(/\s+/).filter((k) => k.length > 1);

    const scored: { item: MemoryItem; score: number }[] = [];

    for (const item of memories) {
      let score = 0;
      const contentLower = item.content.toLowerCase();
      const titleLower = (item.title || item.key || '').toLowerCase();
      const categoryLower = item.category.toLowerCase();
      const tags = (item.tags || []).map((t) => t.toLowerCase());

      // 1. Exact content match
      if (contentLower.includes(cleanQuery)) {
        score += 100;
      }

      // 2. Title match
      if (titleLower && (titleLower.includes(cleanQuery) || cleanQuery.includes(titleLower))) {
        score += 80;
      }

      // 3. Tag matches
      for (const tag of tags) {
        if (cleanQuery.includes(tag) || tag.includes(cleanQuery)) {
          score += 50;
        }
      }

      // 4. Category match
      if (cleanQuery.includes(categoryLower)) {
        score += 30;
      }

      // 5. Keyword matches
      for (const kw of keywords) {
        if (contentLower.includes(kw)) score += 15;
        if (titleLower.includes(kw)) score += 20;
        if (tags.some((t) => t.includes(kw))) score += 15;
      }

      // Importance boost
      score += (item.importance || 0.5) * 10;
      if (item.isExplicit) score += 10;

      if (score > 0) {
        scored.push({ item, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.item);
  }

  /**
   * Delete memory items by natural query matching.
   */
  public async deleteMemoryByQuery(query: string): Promise<{ deletedCount: number; deletedIds: string[] }> {
    const matches = this.findRelevantMemories(query, 5);
    if (matches.length === 0) {
      return { deletedCount: 0, deletedIds: [] };
    }

    const deletedIds: string[] = [];
    for (const match of matches) {
      if (this.deleteMemory(match.id)) {
        deletedIds.push(match.id);
      }
    }

    return {
      deletedCount: deletedIds.length,
      deletedIds,
    };
  }

  /**
   * Get memory statistics.
   */
  public getStats(): MemoryStats {
    const memories = this.getAllMemories();
    const categoryCounts: Record<MemoryCategory, number> = {
      identity: 0,
      preference: 0,
      project: 0,
      instruction: 0,
      habit: 0,
      context: 0,
      other: 0,
    };

    let highImportanceCount = 0;

    for (const m of memories) {
      if (categoryCounts[m.category] !== undefined) {
        categoryCounts[m.category]++;
      } else {
        categoryCounts.other++;
      }

      if (m.importance >= 0.8) {
        highImportanceCount++;
      }
    }

    return {
      totalCount: memories.length,
      categoryCounts,
      highImportanceCount,
    };
  }

  /**
   * Developer debug info inspection.
   */
  public getDebugInfo(): MemoryDebugInfo {
    const memories = this.getAllMemories();
    this.debugInfo.totalMemoriesCount = memories.length;
    return { ...this.debugInfo };
  }

  private updateStatsDebug(
    op: 'SAVE' | 'SEARCH' | 'UPDATE' | 'DELETE' | 'CLEAR' | 'INIT',
    res: 'SUCCESS' | 'FAILED',
    memId: string | null = null,
    err: string | null = null
  ): void {
    const total = this.getAllMemories().length;
    this.debugInfo = {
      storage: 'localStorage',
      key: STORAGE_KEY,
      databaseName: 'localStorage (OREO_MEMORIES)',
      storeName: STORAGE_KEY,
      isIndexedDbSupported: false,
      isDbConnected: true,
      totalMemoriesCount: total,
      lastOperation: op,
      lastResult: res,
      lastMemoryId: memId,
      lastError: err,
      lastTimestamp: Date.now(),
    };
  }

  /**
   * Export all memories as JSON formatted string.
   */
  public exportJson(): string {
    const memories = this.getAllMemories();
    return JSON.stringify(memories, null, 2);
  }

  /**
   * Import memories from a JSON string.
   */
  public importJson(jsonStr: string): number {
    if (typeof localStorage === 'undefined') throw new Error('localStorage not available');

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid JSON: expected an array of memory objects.');
    }

    let count = 0;
    for (const item of parsed) {
      if (item && typeof item.content === 'string' && item.content.trim()) {
        this.saveMemory(item);
        count++;
      }
    }

    return count;
  }

  /**
   * Get short-term session context.
   */
  public getConversationContext(): ConversationMemoryContext {
    return { ...this.conversationContext };
  }

  /**
   * Update short-term session context.
   */
  public updateConversationContext(updates: Partial<ConversationMemoryContext>): void {
    this.conversationContext = {
      ...this.conversationContext,
      ...updates,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Format long-term memories for AI prompt injection.
   */
  public getMemoriesForPrompt(): string {
    const memories = this.getAllMemories();
    if (memories.length === 0) return 'No stored user memories.';

    // Sort by importance descending
    const sorted = [...memories].sort((a, b) => (b.importance || 0.5) - (a.importance || 0.5));
    return sorted
      .map((m) => `- [${m.category.toUpperCase()}] ${m.key || m.title ? `${m.key || m.title}: ` : ''}${m.content}`)
      .join('\n');
  }

  /**
   * Subscribe to memory mutation events.
   */
  public subscribe(listener: MemoryEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(event: {
    type: 'memory_added' | 'memory_updated' | 'memory_deleted' | 'memory_cleared';
    data?: any;
  }): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[OREO Memory] Listener error:', err);
      }
    }
  }
}
