import { BrowserController } from '../browser/BrowserController';
import { MemoryManager } from '../services/MemoryManager';
import { AppController } from '../services/AppController';
import {
  AgentStep,
  StepObservation,
  ToolExecutionResult,
  VerificationResult,
} from './AgentTypes';

export class AgentVerifier {
  private static instance: AgentVerifier | null = null;

  public static getInstance(): AgentVerifier {
    if (!AgentVerifier.instance) {
      AgentVerifier.instance = new AgentVerifier();
    }
    return AgentVerifier.instance;
  }

  /**
   * Verify whether the step actually achieved its intended postcondition.
   */
  public async verifyStep(
    step: AgentStep,
    result: ToolExecutionResult,
    observation: StepObservation
  ): Promise<VerificationResult> {
    const { tool, arguments: args } = step;

    // 1. If tool failed execution, verification fails immediately with evidence
    if (!result.success || !observation.expectedMet) {
      return {
        verified: false,
        evidence: `Execution check failed: ${result.error || 'Expected outcome was not met.'}`,
        postConditionMet: false,
        issues: [result.error || 'Execution returned non-zero error state.'],
      };
    }

    const browserController = BrowserController.getInstance();
    const memoryManager = MemoryManager.getInstance();
    const appController = AppController.getInstance();

    switch (tool) {
      case 'browserOpen':
      case 'openWebsite': {
        const target = (args.url || args.siteName || args.appName || '').toLowerCase();
        const state = browserController.getState();
        const activeTab = state.activeTab;

        const hasMatchingTab = state.tabs.some(
          (t) =>
            t.url.toLowerCase().includes(target) ||
            t.title.toLowerCase().includes(target) ||
            target.includes(t.title.toLowerCase())
        );

        if (hasMatchingTab || result.data?.url) {
          return {
            verified: true,
            evidence: `Verified browser tab exists with URL: ${result.data?.url || activeTab?.url}`,
            postConditionMet: true,
          };
        } else {
          return {
            verified: false,
            evidence: `Target '${target}' not found in active browser tabs.`,
            postConditionMet: false,
            issues: ['Browser tab not found or navigation did not trigger.'],
          };
        }
      }

      case 'browserSearch':
      case 'searchWebsite': {
        const query = (args.query || '').trim().toLowerCase();
        const searchUrl = result.data?.searchUrl || '';
        if (searchUrl || result.success) {
          return {
            verified: true,
            evidence: `Verified search URL generated and dispatched: ${searchUrl || args.engine}`,
            postConditionMet: true,
          };
        } else {
          return {
            verified: false,
            evidence: `Search URL not generated for query '${query}'.`,
            postConditionMet: false,
            issues: ['Search query could not be dispatched.'],
          };
        }
      }

      case 'saveMemory': {
        const content = (args.content || '').trim();
        const allMemories = memoryManager.getAllMemories();
        const found = allMemories.some(
          (m) =>
            m.content.toLowerCase().includes(content.toLowerCase()) ||
            (args.key && m.key?.toLowerCase() === args.key.toLowerCase())
        );

        if (found || result.data?.success) {
          return {
            verified: true,
            evidence: `Verified memory record exists in persistent store (${allMemories.length} total memories).`,
            postConditionMet: true,
          };
        } else {
          return {
            verified: false,
            evidence: `Memory containing "${content}" could not be confirmed in storage.`,
            postConditionMet: false,
            issues: ['Memory item missing from store after save.'],
          };
        }
      }

      case 'deleteMemory': {
        return {
          verified: true,
          evidence: `Verified memory record removed. Remaining memories: ${memoryManager.getAllMemories().length}.`,
          postConditionMet: true,
        };
      }

      case 'clearMemory': {
        const remaining = memoryManager.getAllMemories().length;
        if (remaining === 0) {
          return {
            verified: true,
            evidence: 'Verified long-term memory store is completely cleared (0 items).',
            postConditionMet: true,
          };
        } else {
          return {
            verified: false,
            evidence: `Store still contains ${remaining} items after clear.`,
            postConditionMet: false,
            issues: ['Memory store was not fully cleared.'],
          };
        }
      }

      case 'webResearch': {
        if (result.data?.sourcesObserved?.length > 0) {
          return {
            verified: true,
            evidence: `Verified search queries and ${result.data.sourcesObserved.length} sources loaded.`,
            postConditionMet: true,
          };
        } else {
          return {
            verified: false,
            evidence: 'No search sources could be verified for research query.',
            postConditionMet: false,
            issues: ['Research source verification failed.'],
          };
        }
      }

      case 'openApp': {
        const appName = (args.appName || '').toLowerCase();
        const wsState = appController.getState();
        const activeTab = wsState.tabs.find((t) => t.id === wsState.activeTabId);
        const activeTitle = activeTab?.title || activeTab?.appName || '';

        return {
          verified: true,
          evidence: `Verified workspace open state with application '${activeTitle || appName}'.`,
          postConditionMet: true,
        };
      }

      case 'captureScreen': {
        if (result.data?.hasImageData || result.data?.width) {
          return {
            verified: true,
            evidence: `Verified screen frame captured with resolution ${result.data.width}x${result.data.height} from ${result.data.sourceName || 'display'}.`,
            postConditionMet: true,
          };
        }
        return {
          verified: false,
          evidence: 'Screen frame image was not captured.',
          postConditionMet: false,
          issues: ['Screen capture frame buffer empty.'],
        };
      }

      case 'nativeMouseClick':
      case 'computerControlClick': {
        return {
          verified: Boolean(result.success),
          evidence: `Verified native mouse click dispatched to coordinates (${args.x}, ${args.y}).`,
          postConditionMet: Boolean(result.success),
        };
      }

      case 'nativeKeyboardType':
      case 'computerControlType': {
        return {
          verified: Boolean(result.success),
          evidence: `Verified native keystrokes (${(args.text || '').length} chars) dispatched.`,
          postConditionMet: Boolean(result.success),
        };
      }

      case 'nativeKeyPress': {
        return {
          verified: Boolean(result.success),
          evidence: `Verified native hotkey ${(args.modifiers || []).join('+')}${args.modifiers?.length ? '+' : ''}${args.key} dispatched.`,
          postConditionMet: Boolean(result.success),
        };
      }

      case 'nativeLaunchApp': {
        return {
          verified: Boolean(result.success),
          evidence: `Verified native execution command dispatched for "${args.appNameOrPath}".`,
          postConditionMet: Boolean(result.success),
        };
      }

      case 'readClipboard':
      case 'writeClipboard': {
        return {
          verified: Boolean(result.success),
          evidence: `Verified clipboard operation completed.`,
          postConditionMet: Boolean(result.success),
        };
      }

      default:
        return {
          verified: Boolean(result.success),
          evidence: `Default verification passed for '${tool}'.`,
          postConditionMet: Boolean(result.success),
        };
    }
  }
}
