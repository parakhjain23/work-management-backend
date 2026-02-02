/**
 * Purpose: Match domain events to active system prompts
 * Finds prompts that should be triggered for a given event
 */

import { DomainEvent } from '../types/events.types.js';
import { SystemPromptsService } from './systemPrompts.service.js';

export interface MatchedPrompt {
  promptId: bigint;
  name: string;
  keyName: string;
  conditionCode: string;
  promptTemplate: string;
  priority: number;
}

export class SystemPromptMatcher {
  private systemPromptsService = new SystemPromptsService();

  /**
   * Purpose: Find all active prompts that match the event type
   * Returns prompts sorted by priority (highest first)
   */
  async matchEvent(event: DomainEvent): Promise<MatchedPrompt[]> {
    try {
      // Parse org_id from event
      const orgId = BigInt(event.org_id);

      // Construct event type from entity and action
      const eventType = `${event.entity}.${event.action}`;

      console.log(`[System Prompt Matcher] Matching event: ${eventType} for org: ${orgId}`);

      // Get active prompts for this event type
      const prompts = await this.systemPromptsService.findActiveByEventType(orgId, eventType);

      if (prompts.length === 0) {
        console.log(`[System Prompt Matcher] No active prompts found for ${eventType}`);
        return [];
      }

      console.log(`[System Prompt Matcher] Found ${prompts.length} active prompts for ${eventType}`);

      // Map to MatchedPrompt format
      const matchedPrompts: MatchedPrompt[] = prompts.map(p => ({
        promptId: p.id,
        name: p.name,
        keyName: p.keyName,
        conditionCode: p.conditionCode,
        promptTemplate: p.promptTemplate,
        priority: p.priority
      }));

      return matchedPrompts;
    } catch (error) {
      console.error('[System Prompt Matcher] Error matching event:', error);
      return [];
    }
  }

  /**
   * Purpose: Get all event types that have active prompts for an organization
   */
  async getActiveEventTypes(orgId: bigint): Promise<string[]> {
    try {
      const allPrompts = await this.systemPromptsService.findAll(orgId);
      
      const activeEventTypes = allPrompts
        .filter(p => p.isActive)
        .map(p => p.eventType);

      // Return unique event types
      return [...new Set(activeEventTypes)];
    } catch (error) {
      console.error('[System Prompt Matcher] Error getting active event types:', error);
      return [];
    }
  }
}
