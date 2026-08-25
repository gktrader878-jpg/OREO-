import { AgentEngine } from './AgentEngine';
import { AgentTask, ToolExecutionResult } from './AgentTypes';

export interface SpecialistAgent {
  name: string;
  role: string;
  capabilities: string[];
  canHandle: (task: AgentTask) => boolean;
  execute: (task: AgentTask) => Promise<ToolExecutionResult>;
}

export class AgentManager {
  private static instance: AgentManager | null = null;
  private specialists: Map<string, SpecialistAgent> = new Map();
  private primaryEngine: AgentEngine = AgentEngine.getInstance();

  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  constructor() {
    this.registerCoreSpecialists();
  }

  private registerCoreSpecialists(): void {
    // 1. Browser Specialist
    this.registerSpecialist({
      name: 'BrowserAgent',
      role: 'Web navigation, live search, tab lifecycle and web research execution',
      capabilities: ['browser_navigation', 'search', 'tabs', 'workspace_display'],
      canHandle: (task) => task.intent === 'browser_action' || task.intent === 'multi_step_task',
      execute: async (task) => {
        const res = await this.primaryEngine.start(task.goal);
        return { success: res.success, data: res };
      },
    });

    // 2. Research Specialist
    this.registerSpecialist({
      name: 'ResearchAgent',
      role: 'In-depth multi-source web inquiry, synthesis and comparison',
      capabilities: ['web_search', 'synthesis', 'comparison'],
      canHandle: (task) => task.intent === 'web_research',
      execute: async (task) => {
        const res = await this.primaryEngine.start(task.goal);
        return { success: res.success, data: res };
      },
    });

    // 3. Memory Specialist
    this.registerSpecialist({
      name: 'MemoryAgent',
      role: 'Long-term memory indexing, recall, and context persistence',
      capabilities: ['save_memory', 'query_memory', 'delete_memory'],
      canHandle: (task) => task.intent === 'memory_task',
      execute: async (task) => {
        const res = await this.primaryEngine.start(task.goal);
        return { success: res.success, data: res };
      },
    });
  }

  public registerSpecialist(agent: SpecialistAgent): void {
    this.specialists.set(agent.name, agent);
  }

  public getSpecialist(name: string): SpecialistAgent | undefined {
    return this.specialists.get(name);
  }

  public getAllSpecialists(): SpecialistAgent[] {
    return Array.from(this.specialists.values());
  }
}
