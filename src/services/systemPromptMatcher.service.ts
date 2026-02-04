/**
 * Purpose: Match domain events to system prompts
 * Finds prompts that should be triggered for a given event
 */

import { EventData } from '../types/events.types.js';
import { SystemPromptsService } from './systemPrompts.service.js';

export interface MatchedPrompt {
  promptId: number;
  name: string;
  conditionCode: string;
  promptTemplate: string;
}

export class SystemPromptMatcher {
  private systemPromptsService = new SystemPromptsService();

  /**
   * Purpose: Find all prompts that match the event type
   */
  async matchEvent(eventData: EventData): Promise<MatchedPrompt[]> {
    try {
      // Parse org_id from event
      const orgId = Number(eventData.org_id);

      // Construct event type from entity and action
      const eventType = `${eventData.entity}.${eventData.action}`;

      console.log(`[System Prompt Matcher] Matching event: ${eventType} for org: ${orgId}`);

      // Get prompts for this event type
      const prompts = await this.systemPromptsService.findByEventType(orgId, eventType);

      if (prompts.length === 0) {
        console.log(`[System Prompt Matcher] No prompts found for ${eventType}`);
        return [];
      }

      console.log(`[System Prompt Matcher] Found ${prompts.length} prompt(s) for ${eventType}`);

      // Map to MatchedPrompt format
      const matchedPrompts: MatchedPrompt[] = prompts.map(p => ({
        promptId: Number(p.id),
        name: p.name,
        conditionCode: p.conditionCode || '',
        promptTemplate: p.promptTemplate
      }));

      return matchedPrompts;
    } catch (error) {
      console.error('[System Prompt Matcher] Error matching event:', error);
      return [];
    }
  }

  /**
   * Purpose: Get all event types that have prompts for an organization
   */
  async getEventTypes(orgId: number): Promise<string[]> {
    try {
      const allPrompts = await this.systemPromptsService.findAll(orgId);
      
      const eventTypes = allPrompts.map(p => p.eventType);

      // Return unique event types
      return [...new Set(eventTypes)];
    } catch (error) {
      console.error('[System Prompt Matcher] Error getting event types:', error);
      return [];
    }
  }
}
