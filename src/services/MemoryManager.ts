import { ConversationMemoryContext, MemoryCategory, MemoryItem, MemoryStats } from '../types';

export type MemoryEventListener = (event: {
  type: 'memory_added' | 'memory_updated' | 'memory_deleted' | 'memory_cleared';
  data?: any;
}) => void;

const DB_NAME = 'oreo_memory_db';
const DB_VERSION = 1;
const STORE_NAME = 'memories';
const LOCAL_STORAGE_KEY = 'oreo_longterm_memories_fallback';

export class MemoryManager {
  private static instance: MemoryManager | null = null;
  private memoriesCache: Map<string, MemoryItem> = new Map();
  private isInitialized: boolean = false;
  private db: IDBDatabase | null = null;
  private listeners: Set<MemoryEventListener> = new Set();

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
    this.init();
  }

  /**
   * Initializes IndexedDB with automatic schema creation and robust dual-storage persistence.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // First load immediately from localStorage for zero-latency retrieval
      this.loadFromLocalStorage();

      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        this.db = await this.openDatabase();
        const loadedFromIDB = await this.loadAllFromIndexedDB();
        
        // Merge IDB items with any localStorage items (preferring most recently updated)
        for (const item of loadedFromIDB) {
          const cached = this.memoriesCache.get(item.id);
          if (!cached || item.updatedAt >= cached.updatedAt) {
            this.memoriesCache.set(item.id, item);
          }
        }
        
        // Save back merged results to both stores
        this.syncToLocalStorage();
        for (const item of this.memoriesCache.values()) {
          await this.saveItemToDb(item).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[MemoryManager] Storage merge/init warning, continuing with localStorage:', err);
      this.loadFromLocalStorage();
    }

    // Seed default knowledge if empty
    if (this.memoriesCache.size === 0) {
      await this.seedInitialMemories();
    }

    this.isInitialized = true;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('importance', 'importance', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('isExplicit', 'isExplicit', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private loadAllFromIndexedDB(): Promise<MemoryItem[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve((request.result as MemoryItem[]) || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private loadFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.memoriesCache.clear();
          parsed.forEach((m) => this.memoriesCache.set(m.id, m));
        }
      }
    } catch (err) {
      console.error('[MemoryManager] Error reading localStorage fallback:', err);
    }
  }

  private syncToLocalStorage(): void {
    try {
      const list = Array.from(this.memoriesCache.values());
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.error('[MemoryManager] Error saving to localStorage:', err);
    }
  }

  private async saveItemToDb(item: MemoryItem): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(item);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      });
    } else {
      this.syncToLocalStorage();
    }
  }

  private async deleteItemFromDb(id: string): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      });
    } else {
      this.syncToLocalStorage();
    }
  }

  private async clearDb(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      });
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }

  private async seedInitialMemories(): Promise<void> {
    const defaults: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        key: 'Project Name',
        category: 'project',
        content: "User is developing and interacting with the OREO AI Assistant system.",
        importance: 0.9,
        isExplicit: true,
        tags: ['project', 'oreo', 'primary'],
      },
      {
        key: 'Interface & Voice Preference',
        category: 'preference',
        content: 'Prefers ultra-low latency, real-time voice-to-voice interaction with concise responses.',
        importance: 0.8,
        isExplicit: true,
        tags: ['voice', 'preference', 'speed'],
      },
    ];

    for (const d of defaults) {
      await this.addMemory(d);
    }
  }

  public subscribe(listener: MemoryEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: {
    type: 'memory_added' | 'memory_updated' | 'memory_deleted' | 'memory_cleared';
    data?: any;
  }): void {
    this.listeners.forEach((l) => l(event));
  }

  // ----------------------------------------------------
  // PUBLIC CRUD INTERFACE
  // ----------------------------------------------------

  /**
   * Adds a selective, valuable long-term memory.
   */
  public async addMemory(data: {
    content: string;
    category?: MemoryCategory;
    key?: string;
    importance?: number;
    isExplicit?: boolean;
    tags?: string[];
  }): Promise<MemoryItem> {
    await this.init();

    // Check if an existing memory with a similar key or identical content already exists
    const existing = Array.from(this.memoriesCache.values()).find(
      (m) =>
        (data.key && m.key && m.key.toLowerCase() === data.key.toLowerCase()) ||
        m.content.toLowerCase().trim() === data.content.toLowerCase().trim()
    );

    const now = Date.now();

    if (existing) {
      // Update existing memory instead of duplicating
      const updated: MemoryItem = {
        ...existing,
        content: data.content,
        category: data.category || existing.category,
        key: data.key || existing.key,
        importance: data.importance !== undefined ? data.importance : Math.max(existing.importance, 0.6),
        isExplicit: data.isExplicit !== undefined ? data.isExplicit : existing.isExplicit,
        tags: data.tags || existing.tags,
        updatedAt: now,
        accessCount: (existing.accessCount || 0) + 1,
      };

      this.memoriesCache.set(updated.id, updated);
      await this.saveItemToDb(updated);
      this.syncToLocalStorage();

      this.notify({ type: 'memory_updated', data: updated });
      return updated;
    }

    const newId = `mem_${now.toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newMemory: MemoryItem = {
      id: newId,
      key: data.key || this.deriveKeyFromContent(data.content, data.category || 'other'),
      category: data.category || 'other',
      content: data.content.trim(),
      importance: data.importance !== undefined ? Math.min(1.0, Math.max(0.1, data.importance)) : 0.7,
      isExplicit: data.isExplicit !== undefined ? data.isExplicit : true,
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
      accessCount: 1,
      lastAccessedAt: now,
    };

    this.memoriesCache.set(newMemory.id, newMemory);
    await this.saveItemToDb(newMemory);
    this.syncToLocalStorage();

    this.notify({ type: 'memory_added', data: newMemory });
    return newMemory;
  }

  private deriveKeyFromContent(content: string, category: MemoryCategory): string {
    const lower = content.toLowerCase();
    if (lower.includes('project')) return 'Project Detail';
    if (lower.includes('name')) return 'User Name';
    if (lower.includes('theme') || lower.includes('dark') || lower.includes('light')) return 'Theme Preference';
    if (lower.includes('voice') || lower.includes('speed')) return 'Voice Setting';
    if (category === 'identity') return 'User Identity';
    if (category === 'preference') return 'User Preference';
    if (category === 'project') return 'Project Context';
    if (category === 'instruction') return 'Custom Rule';
    if (category === 'habit') return 'User Habit';
    return content.slice(0, 24) + (content.length > 24 ? '...' : '');
  }

  public async getMemory(id: string): Promise<MemoryItem | null> {
    await this.init();
    const item = this.memoriesCache.get(id);
    if (item) {
      item.accessCount = (item.accessCount || 0) + 1;
      item.lastAccessedAt = Date.now();
      await this.saveItemToDb(item);
      return { ...item };
    }
    return null;
  }

  public async getAllMemories(): Promise<MemoryItem[]> {
    await this.init();
    return Array.from(this.memoriesCache.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public async getMemoriesByCategory(category: MemoryCategory): Promise<MemoryItem[]> {
    await this.init();
    return Array.from(this.memoriesCache.values())
      .filter((m) => m.category === category)
      .sort((a, b) => b.importance - a.importance || b.updatedAt - a.updatedAt);
  }

  public async updateMemory(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    await this.init();
    const existing = this.memoriesCache.get(id);
    if (!existing) return null;

    const updated: MemoryItem = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    };

    this.memoriesCache.set(id, updated);
    await this.saveItemToDb(updated);
    this.syncToLocalStorage();

    this.notify({ type: 'memory_updated', data: updated });
    return updated;
  }

  public async deleteMemory(id: string): Promise<boolean> {
    await this.init();
    if (!this.memoriesCache.has(id)) return false;

    const item = this.memoriesCache.get(id);
    this.memoriesCache.delete(id);
    await this.deleteItemFromDb(id);
    this.syncToLocalStorage();

    this.notify({ type: 'memory_deleted', data: { id, item } });
    return true;
  }

  /**
   * Deletes memories matching natural language query (e.g. "dark theme", "project", "voice").
   */
  public async deleteMemoryByQuery(query: string): Promise<{ deletedCount: number; deletedItems: MemoryItem[] }> {
    await this.init();
    const q = query.toLowerCase().trim();
    if (!q) return { deletedCount: 0, deletedItems: [] };

    const matching: MemoryItem[] = [];

    for (const item of this.memoriesCache.values()) {
      if (
        item.id.toLowerCase() === q ||
        (item.key && item.key.toLowerCase().includes(q)) ||
        item.content.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
      ) {
        matching.push(item);
      }
    }

    for (const item of matching) {
      this.memoriesCache.delete(item.id);
      await this.deleteItemFromDb(item.id);
    }

    if (matching.length > 0) {
      this.syncToLocalStorage();
      this.notify({ type: 'memory_deleted', data: { items: matching } });
    }

    return {
      deletedCount: matching.length,
      deletedItems: matching,
    };
  }

  public async clearMemory(): Promise<void> {
    await this.init();
    this.memoriesCache.clear();
    await this.clearDb();
    this.syncToLocalStorage();
    this.notify({ type: 'memory_cleared' });
  }

  /**
   * Search memory with query and optional category filter.
   */
  public async searchMemory(query: string, category?: MemoryCategory | 'all'): Promise<MemoryItem[]> {
    await this.init();
    const q = (query || '').toLowerCase().trim();

    let items = Array.from(this.memoriesCache.values());

    if (category && category !== 'all') {
      items = items.filter((m) => m.category === category);
    }

    if (!q) {
      return this.rankMemories(items);
    }

    const filtered = items.filter((item) => {
      const matchKey = item.key?.toLowerCase().includes(q) || false;
      const matchContent = item.content.toLowerCase().includes(q);
      const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q)) || false;
      const matchCat = item.category.toLowerCase().includes(q);
      return matchKey || matchContent || matchTags || matchCat;
    });

    return this.rankMemories(filtered, q);
  }

  /**
   * Ranks memories using:
   * 1. Explicitly saved memories
   * 2. Current project information
   * 3. User preferences
   * 4. High importance weighting (0.1 - 1.0)
   * 5. Recency
   */
  public rankMemories(memories: MemoryItem[], contextQuery?: string): MemoryItem[] {
    const q = contextQuery ? contextQuery.toLowerCase().trim() : '';

    return [...memories].sort((a, b) => {
      let scoreA = a.importance * 10;
      let scoreB = b.importance * 10;

      if (a.isExplicit) scoreA += 5;
      if (b.isExplicit) scoreB += 5;

      if (a.category === 'identity') scoreA += 4;
      if (b.category === 'identity') scoreB += 4;

      if (a.category === 'project') scoreA += 3;
      if (b.category === 'project') scoreB += 3;

      if (a.category === 'preference') scoreA += 2;
      if (b.category === 'preference') scoreB += 2;

      if (q) {
        if (a.key && a.key.toLowerCase().includes(q)) scoreA += 8;
        if (b.key && b.key.toLowerCase().includes(q)) scoreB += 8;
        if (a.content.toLowerCase().includes(q)) scoreA += 5;
        if (b.content.toLowerCase().includes(q)) scoreB += 5;
      }

      // Recency tie-breaker
      if (scoreA === scoreB) {
        return b.updatedAt - a.updatedAt;
      }

      return scoreB - scoreA;
    });
  }

  /**
   * Selectively retrieves the most relevant memories for the active conversation topic.
   */
  public async retrieveRelevantMemories(topicOrQuery?: string, limit: number = 6): Promise<MemoryItem[]> {
    await this.init();
    const ranked = await this.searchMemory(topicOrQuery || '');
    return ranked.slice(0, limit);
  }

  /**
   * Generates a clean markdown/text summary of relevant memories for model context.
   */
  public async formatMemoriesForContext(topicOrQuery?: string, limit: number = 5): Promise<string> {
    const relevant = await this.retrieveRelevantMemories(topicOrQuery, limit);
    if (relevant.length === 0) return '';

    return relevant
      .map(
        (m) =>
          `• [${m.category.toUpperCase()}] ${m.key ? m.key + ': ' : ''}${m.content}`
      )
      .join('\n');
  }

  public async getStats(): Promise<MemoryStats> {
    await this.init();
    const all = Array.from(this.memoriesCache.values());

    const counts: Record<MemoryCategory, number> = {
      identity: 0,
      preference: 0,
      project: 0,
      instruction: 0,
      habit: 0,
      context: 0,
      other: 0,
    };

    let highCount = 0;

    for (const item of all) {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      } else {
        counts.other++;
      }
      if (item.importance >= 0.75) {
        highCount++;
      }
    }

    return {
      totalCount: all.length,
      categoryCounts: counts,
      highImportanceCount: highCount,
    };
  }

  public async exportJson(): Promise<string> {
    await this.init();
    const all = Array.from(this.memoriesCache.values());
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        version: 1,
        app: 'OREO AI Assistant',
        memories: all,
      },
      null,
      2
    );
  }

  public async importJson(jsonStr: string): Promise<number> {
    await this.init();
    try {
      const parsed = JSON.parse(jsonStr);
      const items: MemoryItem[] = Array.isArray(parsed) ? parsed : parsed.memories;
      if (!Array.isArray(items)) throw new Error('Invalid JSON format: expected array of memories');

      let imported = 0;
      for (const item of items) {
        if (item.content) {
          await this.addMemory({
            content: item.content,
            category: item.category || 'other',
            key: item.key,
            importance: item.importance,
            isExplicit: item.isExplicit,
            tags: item.tags,
          });
          imported++;
        }
      }
      return imported;
    } catch (err) {
      console.error('[MemoryManager] Failed to import JSON:', err);
      throw err;
    }
  }

  // ----------------------------------------------------
  // CURRENT CONVERSATION MEMORY (SESSION CONTEXT ONLY)
  // ----------------------------------------------------

  public setSessionTopic(topic: string): void {
    if (!topic || topic.trim() === '') return;
    this.conversationContext.currentTopic = topic;
    if (!this.conversationContext.recentTopics.includes(topic)) {
      this.conversationContext.recentTopics.unshift(topic);
      if (this.conversationContext.recentTopics.length > 5) {
        this.conversationContext.recentTopics.pop();
      }
    }
    this.conversationContext.lastUpdated = Date.now();
  }

  public setActiveProject(projectName: string): void {
    this.conversationContext.activeProjectName = projectName;
    this.conversationContext.lastUpdated = Date.now();
  }

  public addTemporaryContext(detail: string): void {
    if (!detail) return;
    this.conversationContext.temporaryContext.push(detail);
    if (this.conversationContext.temporaryContext.length > 10) {
      this.conversationContext.temporaryContext.shift();
    }
    this.conversationContext.lastUpdated = Date.now();
  }

  public getSessionContext(): ConversationMemoryContext {
    return { ...this.conversationContext };
  }

  public clearSessionContext(): void {
    this.conversationContext = {
      currentTopic: undefined,
      activeProjectName: undefined,
      recentTopics: [],
      sessionPreferences: {},
      temporaryContext: [],
      lastUpdated: Date.now(),
    };
  }
}
