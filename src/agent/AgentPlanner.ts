import { ToolRouter } from './ToolRouter';
import { AgentMemory } from './AgentMemory';
import { AgentPermissions } from './AgentPermissions';
import {
  AgentStep,
  AgentTask,
  IntentType,
  PermissionLevel,
} from './AgentTypes';

export class AgentPlanner {
  private static instance: AgentPlanner | null = null;
  private toolRouter: ToolRouter = ToolRouter.getInstance();
  private agentMemory: AgentMemory = AgentMemory.getInstance();
  private permissions: AgentPermissions = AgentPermissions.getInstance();

  public static getInstance(): AgentPlanner {
    if (!AgentPlanner.instance) {
      AgentPlanner.instance = new AgentPlanner();
    }
    return AgentPlanner.instance;
  }

  /**
   * Cleans meta-reasoning, trailing sentences, or conversational fluff from the goal string.
   */
  public sanitizeGoal(goal: string): { cleanGoal: string; coreSubject: string } {
    let raw = (goal || '').trim();

    // 1. Remove trailing prompt or meta-reasoning sentences (e.g. "I need to know the origin city...", "to provide accurate answer to user...")
    raw = raw.replace(/\s*(?:I need to know|Please provide|to provide accurate answer|to answer the user|so that I can|in order to).*/i, '');
    
    // 2. Remove leading directive artifacts
    raw = raw.replace(/^(?:Search Google for|Search for|Find info on|Research)\s+/i, '');

    const cleanGoal = raw.trim() || goal.trim();

    // Core subject
    let coreSubject = cleanGoal
      .replace(/^(?:Book a train ticket to|Book a flight to|Book tickets to|Buy tickets for|Find)\s+/i, '')
      .trim();

    return { cleanGoal, coreSubject };
  }

  /**
   * Classify intent of user goal string.
   */
  public classifyIntent(goal: string): IntentType {
    const g = goal.toLowerCase();

    // Booking or external transactional requests
    if (
      g.includes('book a train') ||
      g.includes('book a flight') ||
      g.includes('book train') ||
      g.includes('book flight') ||
      g.includes('book ticket') ||
      g.includes('book hotel') ||
      g.includes('reserve ticket') ||
      g.includes('buy ticket') ||
      g.includes('order food') ||
      g.includes('purchase')
    ) {
      return 'browser_action';
    }

    if (
      g.includes('remember') ||
      g.includes('recall') ||
      g.includes('forget memory') ||
      g.includes('clear memory') ||
      g.includes('save that') ||
      g.includes('store this')
    ) {
      return 'memory_task';
    }

    if (
      g.includes('research') ||
      g.includes('compare') ||
      g.includes('investigate') ||
      g.includes('find out about') ||
      g.includes('summarize info') ||
      g.includes('features and capabilities') ||
      g.includes('latest features')
    ) {
      return 'web_research';
    }

    if (
      (g.includes('open') || g.includes('go to') || g.includes('navigate')) &&
      (g.includes('and search') || g.includes('then search') || g.includes('then find') || g.includes('and find'))
    ) {
      return 'multi_step_task';
    }

    if (
      g.includes('open') ||
      g.includes('go to') ||
      g.includes('search') ||
      g.includes('youtube') ||
      g.includes('google') ||
      g.includes('tab')
    ) {
      return 'browser_action';
    }

    if (
      g.includes('screenshot') ||
      g.includes('capture screen') ||
      g.includes('observe screen') ||
      g.includes('look at my screen') ||
      g.includes('screen awareness')
    ) {
      return 'system_action';
    }

    if (
      g.includes('click') ||
      g.includes('type into') ||
      g.includes('desktop') ||
      g.includes('mouse') ||
      g.includes('launch app') ||
      g.includes('open app on desktop') ||
      g.includes('clipboard')
    ) {
      return 'automation';
    }

    if (g.includes('what is') || g.includes('how do') || g.includes('who is') || g.includes('why')) {
      return 'question';
    }

    return 'conversation';
  }

  /**
   * Generate structured multi-step plan for a goal.
   */
  public async createPlan(goal: string): Promise<{ task: AgentTask; steps: AgentStep[] }> {
    const { cleanGoal, coreSubject } = this.sanitizeGoal(goal);
    const intent = this.classifyIntent(goal);
    const context = await this.agentMemory.buildContext(cleanGoal);

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const steps: AgentStep[] = [];

    const g = goal.toLowerCase();

    // 1. External Booking or Transaction Requests (Train / Flight / Hotel Bookings)
    // OREO cannot finalize payment or book tickets autonomously; it opens live search portal in workspace truthfully.
    if (
      g.includes('book a train') ||
      g.includes('book train') ||
      g.includes('book a flight') ||
      g.includes('book flight') ||
      g.includes('book ticket') ||
      g.includes('book hotel')
    ) {
      const destination = coreSubject || cleanGoal;
      const searchQuery = `train tickets to ${destination}`;

      steps.push({
        id: `${taskId}_s1`,
        description: `Open live travel & ticket search for "${destination}" in Browser Workspace`,
        tool: 'browserSearch',
        arguments: { engine: 'google', query: searchQuery },
        expectedOutcome: `Live booking search and schedules displayed in browser for user review and completion`,
        status: 'pending',
        permissionLevel: 'LOW_RISK',
        attempts: 0,
        maxAttempts: 3,
      });
    }

    // 2. Compound Browser Action: Open X and Search for Y
    // (e.g. "Open YouTube and search for Techno Gamerz", "Open Google and search for React tutorials")
    else if (
      (g.includes('open') || g.includes('go to')) &&
      (g.includes('search') || g.includes('find'))
    ) {
      let platform = 'google';
      if (g.includes('youtube')) platform = 'youtube';
      else if (g.includes('github')) platform = 'github';
      else if (g.includes('wikipedia')) platform = 'wikipedia';
      else if (g.includes('reddit')) platform = 'reddit';

      // Extract search query
      let query = '';
      const searchMatch = goal.match(/search(?:\s+for|\s+on|\s+youtube|\s+google)?\s+["']?([^"']+)["']?/i);
      if (searchMatch && searchMatch[1]) {
        query = searchMatch[1].replace(/^(for|on|in)\s+/i, '').trim();
      } else {
        query = cleanGoal.replace(/.*(?:search for|search|find)\s+/i, '').trim();
      }

      // Step 1: Open the website
      steps.push({
        id: `${taskId}_s1`,
        description: `Open ${platform.toUpperCase()} in browser workspace`,
        tool: 'browserOpen',
        arguments: { appName: platform },
        expectedOutcome: `${platform.toUpperCase()} opened in browser tab`,
        status: 'pending',
        permissionLevel: 'LOW_RISK',
        attempts: 0,
        maxAttempts: 3,
      });

      // Step 2: Execute search
      steps.push({
        id: `${taskId}_s2`,
        description: `Search for "${query}" on ${platform.toUpperCase()}`,
        tool: 'searchWebsite',
        arguments: { site: platform, query },
        expectedOutcome: `Search results loaded for "${query}"`,
        status: 'pending',
        permissionLevel: 'LOW_RISK',
        attempts: 0,
        maxAttempts: 3,
      });
    }

    // 3. Web Research & Multi-Source Comparison
    // (e.g. "Research the latest AI agent frameworks and compare them", "Search Google for latest features and capabilities of Gemini 1.5 Pro")
    else if (intent === 'web_research' || g.includes('features and capabilities') || g.includes('capabilities of')) {
      const topic = cleanGoal || coreSubject || goal;

      steps.push({
        id: `${taskId}_s1`,
        description: `Search Google for documentation and sources on "${topic}"`,
        tool: 'browserSearch',
        arguments: { engine: 'google', query: topic },
        expectedOutcome: `Search queries dispatched and live sources loaded`,
        status: 'pending',
        permissionLevel: 'LOW_RISK',
        attempts: 0,
        maxAttempts: 3,
      });

      steps.push({
        id: `${taskId}_s2`,
        description: `Synthesize research insights and documentation for "${topic}"`,
        tool: 'webResearch',
        arguments: { topic },
        expectedOutcome: `Research synthesis compiled from live browser sources`,
        status: 'pending',
        permissionLevel: 'LOW_RISK',
        attempts: 0,
        maxAttempts: 3,
      });
    }

    // 4. Memory Tasks
    // (e.g. "Remember that my project is called OREO", "Remember that I like dark mode", "Clear all memories")
    else if (intent === 'memory_task') {
      if (g.includes('clear memory') || g.includes('delete all memories')) {
        steps.push({
          id: `${taskId}_s1`,
          description: `Clear all stored memories from OREO core`,
          tool: 'clearMemory',
          arguments: {},
          expectedOutcome: `All stored memories deleted`,
          status: 'pending',
          permissionLevel: 'HIGH_RISK', // Requires user confirmation!
          attempts: 0,
          maxAttempts: 2,
        });
      } else {
        // Extract memory content
        let content = goal.replace(/^(remember that|remember|save memory|record that)\s+/i, '').trim();
        let key = 'User Memory';

        if (content.toLowerCase().includes('project')) {
          key = 'Project Information';
        } else if (content.toLowerCase().includes('name is') || content.toLowerCase().includes('call me')) {
          key = 'User Name';
        } else if (content.toLowerCase().includes('prefer') || content.toLowerCase().includes('like')) {
          key = 'User Preference';
        }

        steps.push({
          id: `${taskId}_s1`,
          description: `Save memory: "${content}"`,
          tool: 'saveMemory',
          arguments: {
            content,
            key,
            category: key.toLowerCase().includes('project') ? 'project' : 'preference',
            importance: 0.9,
          },
          expectedOutcome: `Memory record saved into long-term core`,
          status: 'pending',
          permissionLevel: 'MEDIUM_RISK',
          attempts: 0,
          maxAttempts: 3,
        });
      }
    }

    // 5. Single Browser Open or Search Action
    else if (intent === 'browser_action') {
      if (g.startsWith('search') || g.includes('search for') || g.includes('google for')) {
        const query = cleanGoal.replace(/^(search for|search|google for|google)\s+/i, '').trim();
        steps.push({
          id: `${taskId}_s1`,
          description: `Search Google for "${query}"`,
          tool: 'browserSearch',
          arguments: { engine: 'google', query },
          expectedOutcome: `Search query dispatched`,
          status: 'pending',
          permissionLevel: 'LOW_RISK',
          attempts: 0,
          maxAttempts: 3,
        });
      } else {
        const target = cleanGoal.replace(/^(open|go to|launch|navigate to)\s+/i, '').trim();
        steps.push({
          id: `${taskId}_s1`,
          description: `Open "${target}" in browser`,
          tool: 'browserOpen',
          arguments: { url: target, appName: target },
          expectedOutcome: `Browser navigated to "${target}"`,
          status: 'pending',
          permissionLevel: 'LOW_RISK',
          attempts: 0,
          maxAttempts: 3,
        });
      }
    }

    // 6. Real Screen Awareness & Capture
    else if (
      intent === 'system_action' ||
      g.includes('screenshot') ||
      g.includes('capture screen') ||
      g.includes('observe screen') ||
      g.includes('look at my screen')
    ) {
      steps.push({
        id: `${taskId}_s1`,
        description: 'Capture real desktop/display screen frame and visual dimensions',
        tool: 'captureScreen',
        arguments: {},
        expectedOutcome: 'Live screen frame grabbed with resolution and visual metrics',
        status: 'pending',
        permissionLevel: 'LOW_RISK',
        attempts: 0,
        maxAttempts: 2,
      });
    }

    // 7. Real Desktop Automation & Computer Control
    else if (intent === 'automation' || g.includes('click') || g.includes('type into') || g.includes('launch app')) {
      if (g.includes('click')) {
        const coords = cleanGoal.match(/(\d+)\s*[,x\s]\s*(\d+)/);
        const x = coords ? parseInt(coords[1], 10) : 500;
        const y = coords ? parseInt(coords[2], 10) : 300;

        steps.push({
          id: `${taskId}_s1`,
          description: `Execute native desktop mouse click at coordinate (${x}, ${y})`,
          tool: 'nativeMouseClick',
          arguments: { x, y, button: 'left' },
          expectedOutcome: `Dispatched native cursor event to (${x}, ${y})`,
          status: 'pending',
          permissionLevel: 'HIGH_RISK',
          attempts: 0,
          maxAttempts: 2,
        });
      } else if (g.includes('type')) {
        const textMatch = cleanGoal.match(/type\s+["']?([^"']+)["']?/i);
        const text = textMatch ? textMatch[1] : 'OREO automation test';

        steps.push({
          id: `${taskId}_s1`,
          description: `Type text into active desktop window: "${text}"`,
          tool: 'nativeKeyboardType',
          arguments: { text },
          expectedOutcome: `Dispatched native keystrokes into active focus`,
          status: 'pending',
          permissionLevel: 'HIGH_RISK',
          attempts: 0,
          maxAttempts: 2,
        });
      } else if (g.includes('launch') || g.includes('open app on desktop')) {
        const appTarget = cleanGoal.replace(/^(launch|open app on desktop|launch app)\s+/i, '').trim();

        steps.push({
          id: `${taskId}_s1`,
          description: `Launch native OS application / file "${appTarget}"`,
          tool: 'nativeLaunchApp',
          arguments: { appNameOrPath: appTarget },
          expectedOutcome: `Native process executed for "${appTarget}"`,
          status: 'pending',
          permissionLevel: 'HIGH_RISK',
          attempts: 0,
          maxAttempts: 2,
        });
      } else {
        steps.push({
          id: `${taskId}_s1`,
          description: `Query system diagnostics and active display configuration`,
          tool: 'getSystemInfo',
          arguments: {},
          expectedOutcome: `System hardware and display metrics returned`,
          status: 'pending',
          permissionLevel: 'LOW_RISK',
          attempts: 0,
          maxAttempts: 2,
        });
      }
    }

    // 8. General Inquiry / Fallback
    else {
      steps.push({
        id: `${taskId}_s1`,
        description: `Search browser workspace for "${cleanGoal}"`,
        tool: 'browserSearch',
        arguments: { engine: 'google', query: cleanGoal },
        expectedOutcome: `Dispatched search query for "${cleanGoal}"`,
        status: 'pending',
        permissionLevel: 'LOW_RISK',
        attempts: 0,
        maxAttempts: 3,
      });
    }

    const task: AgentTask = {
      id: taskId,
      goal: cleanGoal,
      intent,
      steps,
      status: 'planning',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      currentStepIndex: 0,
      context,
      auditLog: [
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          eventType: 'task_created',
          status: 'planning',
          details: `Plan formulated with ${steps.length} step(s) for intent '${intent}'.`,
        },
      ],
    };

    return { task, steps };
  }
}

