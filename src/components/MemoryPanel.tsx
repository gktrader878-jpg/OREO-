import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Edit2,
  X,
  Sparkles,
  User,
  Sliders,
  Folder,
  BookOpen,
  Database,
  Download,
  Upload,
  AlertTriangle,
  Check,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  Layers
} from 'lucide-react';
import { MemoryCategory, MemoryItem, MemoryStats } from '../types';
import { MemoryManager } from '../services/MemoryManager';

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ isOpen, onClose }) => {
  const memoryManager = useMemo(() => MemoryManager.getInstance(), []);

  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<MemoryStats>({
    totalCount: 0,
    categoryCounts: {
      identity: 0,
      preference: 0,
      project: 0,
      instruction: 0,
      habit: 0,
      context: 0,
      other: 0,
    },
    highImportanceCount: 0,
  });

  const [activeCategory, setActiveCategory] = useState<MemoryCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [minImportanceFilter, setMinImportanceFilter] = useState<number>(0);
  const [isExplicitOnly, setIsExplicitOnly] = useState(false);
  const [showDeveloperMeta, setShowDeveloperMeta] = useState(false);

  // Form states for Add / Edit
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Form fields
  const [formKey, setFormKey] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<MemoryCategory>('preference');
  const [formImportance, setFormImportance] = useState<number>(0.8);
  const [formIsExplicit, setFormIsExplicit] = useState<boolean>(true);
  const [formTags, setFormTags] = useState('');

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    const all = await memoryManager.getAllMemories();
    const st = await memoryManager.getStats();
    setMemories(all);
    setStats(st);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = memoryManager.subscribe((event) => {
      loadData();
    });
    return () => unsubscribe();
  }, [memoryManager]);

  // Flash action notification message
  const flashMessage = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3000);
  };

  // Filtered memory list
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      if (activeCategory !== 'all' && m.category !== activeCategory) return false;
      if (m.importance < minImportanceFilter) return false;
      if (isExplicitOnly && !m.isExplicit) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchKey = m.key?.toLowerCase().includes(q) || false;
        const matchContent = m.content.toLowerCase().includes(q);
        const matchCat = m.category.toLowerCase().includes(q);
        const matchTags = m.tags?.some((t) => t.toLowerCase().includes(q)) || false;
        return matchKey || matchContent || matchCat || matchTags;
      }
      return true;
    });
  }, [memories, activeCategory, minImportanceFilter, isExplicitOnly, searchQuery]);

  // Categories config
  const categoriesConfig: {
    key: MemoryCategory | 'all';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
    color: string;
  }[] = [
    { key: 'all', label: 'All Memories', icon: Brain, count: stats.totalCount, color: 'text-cyan-400' },
    { key: 'identity', label: 'User & Identity', icon: User, count: stats.categoryCounts.identity, color: 'text-purple-400' },
    { key: 'preference', label: 'Preferences', icon: Sliders, count: stats.categoryCounts.preference, color: 'text-blue-400' },
    { key: 'project', label: 'Projects', icon: Folder, count: stats.categoryCounts.project, color: 'text-emerald-400' },
    { key: 'instruction', label: 'Instructions', icon: BookOpen, count: stats.categoryCounts.instruction, color: 'text-amber-400' },
    { key: 'habit', label: 'Habits', icon: Sparkles, count: stats.categoryCounts.habit, color: 'text-pink-400' },
    { key: 'context', label: 'Context & Other', icon: Database, count: stats.categoryCounts.context + stats.categoryCounts.other, color: 'text-zinc-400' },
  ];

  const handleOpenAdd = () => {
    setFormKey('');
    setFormContent('');
    setFormCategory('preference');
    setFormImportance(0.8);
    setFormIsExplicit(true);
    setFormTags('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (m: MemoryItem) => {
    setEditingMemory(m);
    setFormKey(m.key || '');
    setFormContent(m.content);
    setFormCategory(m.category);
    setFormImportance(m.importance);
    setFormIsExplicit(m.isExplicit);
    setFormTags(m.tags?.join(', ') || '');
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formContent.trim()) return;

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    await memoryManager.addMemory({
      content: formContent.trim(),
      key: formKey.trim() || undefined,
      category: formCategory,
      importance: formImportance,
      isExplicit: formIsExplicit,
      tags: tagsArray,
    });

    setIsAddModalOpen(false);
    flashMessage('Memory successfully saved to core.');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory || !formContent.trim()) return;

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    await memoryManager.updateMemory(editingMemory.id, {
      content: formContent.trim(),
      key: formKey.trim() || undefined,
      category: formCategory,
      importance: formImportance,
      isExplicit: formIsExplicit,
      tags: tagsArray,
    });

    setEditingMemory(null);
    flashMessage('Memory updated.');
  };

  const handleDelete = async (id: string) => {
    await memoryManager.deleteMemory(id);
    flashMessage('Memory forgotten.');
  };

  const handleClearAll = async () => {
    await memoryManager.clearMemory();
    setConfirmClearOpen(false);
    flashMessage('All long-term memories have been erased.');
  };

  const handleExport = async () => {
    const jsonStr = await memoryManager.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oreo_memories_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flashMessage('Exported memory backup.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const count = await memoryManager.importJson(text);
        flashMessage(`Imported ${count} memories.`);
      } catch (err: any) {
        flashMessage(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getCategoryBadgeClass = (category: MemoryCategory) => {
    switch (category) {
      case 'identity':
        return 'bg-purple-500/15 border-purple-500/30 text-purple-300';
      case 'preference':
        return 'bg-blue-500/15 border-blue-500/30 text-blue-300';
      case 'project':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300';
      case 'instruction':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
      case 'habit':
        return 'bg-pink-500/15 border-pink-500/30 text-pink-300';
      default:
        return 'bg-zinc-800/80 border-zinc-700/50 text-zinc-300';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="oreo-memory-panel-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        id="oreo-memory-panel-container"
        className="relative w-full max-w-5xl h-[88vh] bg-[#07090e] border border-cyan-500/20 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden text-zinc-100"
      >
        {/* Header HUD */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0c1018]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Brain className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">OREO Intelligent Memory Core</h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-medium">
                  {stats.totalCount} Stored Facts
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Persistent long-term memories curated selectively. Only what matters for future sessions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export */}
            <button
              onClick={handleExport}
              id="btn-memory-export"
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
              title="Export memory JSON backup"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Import */}
            <label
              htmlFor="memory-import-input"
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs flex items-center gap-1.5 cursor-pointer"
              title="Import memories from JSON"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
              <input
                id="memory-import-input"
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            {/* Add Memory Button */}
            <button
              onClick={handleOpenAdd}
              id="btn-memory-add"
              className="px-3.5 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Memory</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              id="btn-memory-close"
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Flash Notification */}
        {actionMessage && (
          <div className="px-6 py-2 bg-cyan-950/80 border-b border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-cyan-400" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Main Body with Sidebar Tabs & Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 p-4 bg-[#090d14]/50 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto">
            <div className="hidden md:block px-2 pb-2 text-[10px] uppercase font-bold tracking-widest text-zinc-500">
              Categories
            </div>
            {categoriesConfig.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap md:whitespace-normal ${
                    isActive
                      ? 'bg-cyan-500/15 border border-cyan-500/30 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                      : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${cat.color}`} />
                    <span>{cat.label}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                      isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-white/5 text-zinc-500'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}

            {/* Memory Principle Callout */}
            <div className="hidden md:block mt-auto pt-4 border-t border-white/5">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-zinc-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Selective Memory</span>
                </div>
                <p className="text-[10px] leading-relaxed text-zinc-500">
                  OREO only stores high-utility facts (projects, preferences, user name). Transient chatter is never saved.
                </p>
              </div>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#07090e]">
            {/* Search & Filter Toolbar */}
            <div className="p-4 border-b border-white/10 bg-white/[0.01] flex flex-col sm:flex-row items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search memories, projects, preferences, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Explicit Filter & Importance Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsExplicitOnly(!isExplicitOnly)}
                  className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isExplicitOnly
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Show only user-commanded memories"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Explicit Only</span>
                </button>

                <button
                  onClick={() => setConfirmClearOpen(true)}
                  className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-all text-xs font-medium flex items-center gap-1.5"
                  title="Clear all stored memories"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Clear All</span>
                </button>
              </div>
            </div>

            {/* Memory List Display */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              {filteredMemories.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                  <Brain className="w-12 h-12 text-zinc-700 mb-3" />
                  <h3 className="text-sm font-semibold text-zinc-300">No Memories Found</h3>
                  <p className="text-xs max-w-sm mt-1 text-zinc-500">
                    {searchQuery
                      ? `No memories matching "${searchQuery}".`
                      : "No stored memories in this category yet. Speak to OREO: \"Remember that my project is called...\" or click Add Memory."}
                  </p>
                  <button
                    onClick={handleOpenAdd}
                    className="mt-4 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium hover:bg-cyan-500/30 transition-all"
                  >
                    Create New Memory
                  </button>
                </div>
              ) : (
                filteredMemories.map((m) => {
                  const importancePct = Math.round(m.importance * 100);
                  const formattedDate = new Date(m.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl bg-[#0d121c]/70 border border-white/10 hover:border-cyan-500/30 transition-all group relative"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {/* Key/Label and Category Pill */}
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${getCategoryBadgeClass(
                                m.category
                              )}`}
                            >
                              {m.category}
                            </span>

                            {m.key && (
                              <span className="text-xs font-bold text-white tracking-tight">
                                {m.key}
                              </span>
                            )}

                            {m.isExplicit ? (
                              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-medium flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5" />
                                Explicit
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-medium">
                                Learned
                              </span>
                            )}
                          </div>

                          {/* Content */}
                          <p className="text-sm text-zinc-200 leading-relaxed font-normal">
                            {m.content}
                          </p>

                          {/* Tags if any */}
                          {m.tags && m.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {m.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-zinc-400 font-mono"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Meta footer */}
                          <div className="flex flex-wrap items-center gap-4 mt-3 pt-2.5 border-t border-white/5 text-[11px] text-zinc-500">
                            {/* Importance Bar */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-bold text-zinc-500">Importance</span>
                              <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                                  style={{ width: `${importancePct}%` }}
                                />
                              </div>
                              <span className="font-mono text-zinc-400 text-[10px]">{importancePct}%</span>
                            </div>

                            {/* Date */}
                            <div className="flex items-center gap-1 text-zinc-500">
                              <Clock className="w-3 h-3" />
                              <span>{formattedDate}</span>
                            </div>

                            {showDeveloperMeta && (
                              <span className="font-mono text-[10px] text-zinc-600">
                                ID: {m.id} | Access: {m.accessCount || 1}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                            title="Edit memory"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition-all"
                            title="Delete this memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Status Bar with Dev Inspector Toggle */}
            <div className="px-6 py-3 border-t border-white/10 bg-[#090d14]/90 flex items-center justify-between text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                <span className="font-mono text-[11px] text-zinc-400">Storage: IndexedDB Active (Persistent)</span>
              </div>

              <button
                onClick={() => setShowDeveloperMeta(!showDeveloperMeta)}
                className="text-[11px] text-zinc-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{showDeveloperMeta ? 'Hide Technical Metadata' : 'Show Technical Metadata'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add Memory Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-[#0c1018] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Add Long-Term Memory</h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Label / Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Project Name, Preferred Theme, User Identity"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d14] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="identity">User & Identity</option>
                    <option value="preference">Preference</option>
                    <option value="project">Project</option>
                    <option value="instruction">Instruction</option>
                    <option value="habit">Habit</option>
                    <option value="context">Context & Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Memory Content *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. User is building the OREO AI Assistant and prefers dark theme interfaces."
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-1">
                    <span>Importance Priority</span>
                    <span className="font-mono text-cyan-400">{Math.round(formImportance * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={formImportance}
                    onChange={(e) => setFormImportance(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. theme, visual, dark-mode"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="chk-explicit"
                    checked={formIsExplicit}
                    onChange={(e) => setFormIsExplicit(e.target.checked)}
                    className="rounded accent-cyan-400"
                  />
                  <label htmlFor="chk-explicit" className="text-xs text-zinc-300 select-none cursor-pointer">
                    Explicitly requested by user (High retrieval priority)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  >
                    Save Memory
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Memory Modal */}
        {editingMemory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-[#0c1018] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Edit Memory</h3>
                </div>
                <button
                  onClick={() => setEditingMemory(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Label / Title
                  </label>
                  <input
                    type="text"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090d14] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="identity">User & Identity</option>
                    <option value="preference">Preference</option>
                    <option value="project">Project</option>
                    <option value="instruction">Instruction</option>
                    <option value="habit">Habit</option>
                    <option value="context">Context & Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Memory Content *
                  </label>
                  <textarea
                    rows={3}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-1">
                    <span>Importance Priority</span>
                    <span className="font-mono text-cyan-400">{Math.round(formImportance * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={formImportance}
                    onChange={(e) => setFormImportance(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="chk-explicit-edit"
                    checked={formIsExplicit}
                    onChange={(e) => setFormIsExplicit(e.target.checked)}
                    className="rounded accent-cyan-400"
                  />
                  <label htmlFor="chk-explicit-edit" className="text-xs text-zinc-300 select-none cursor-pointer">
                    Explicitly requested by user
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingMemory(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  >
                    Update Memory
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Clear All Confirmation Modal */}
        {confirmClearOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-[#0e0c0f] border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Erase Long-Term Memory?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                This will permanently delete all stored long-term preferences, project knowledge, and user facts from IndexedDB. This action cannot be undone.
              </p>
              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  onClick={() => setConfirmClearOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 text-xs font-bold shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                >
                  Confirm Erase
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
