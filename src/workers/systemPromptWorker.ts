/**
 * Purpose: RabbitMQ worker to consume domain events
 * Processes events through matcher → evaluator pipeline
 */

import { getRabbitMQChannel } from '../queue/rabbitmq.connection.js';
import { DomainEvent, EventData } from '../types/events.types.js';
import { SystemPromptMatcher } from '../services/systemPromptMatcher.service.js';
import { ConditionEvaluator } from '../services/conditionEvaluator.service.js';
import { WorkItemsService } from '../services/workItems.service.js';
import { SystemPromptsService } from '../services/systemPrompts.service.js';
import { DOMAIN_EVENTS_EXCHANGE, SYSTEMPROMPT_QUEUE_NAME } from '../queue/queue.types.js';

export class SystemPromptWorker {
  private matcher = new SystemPromptMatcher();
  private evaluator = new ConditionEvaluator();
  private workItemsService = new WorkItemsService();
  private systemPromptsService = new SystemPromptsService();

  /**
   * Purpose: Start consuming domain events from RabbitMQ
   */
  async start(): Promise<void> {
    try {
      const channel = getRabbitMQChannel();

      if (!channel) {
        console.error('[System Prompt Worker] RabbitMQ channel not available');
        return;
      }

      // Queue already created and bound in rabbitmq.connection.ts
      console.log('[System Prompt Worker] ✅ Started - Listening for domain events');

      channel.consume(SYSTEMPROMPT_QUEUE_NAME, async (msg) => {
        if (!msg) return;

        try {
          const event: DomainEvent = JSON.parse(msg.content.toString());
          
          console.log(`\n[System Prompt Worker] 📨 Received event: ${event.actionType} (${event.data.entity}.${event.data.action})`);

          await this.processEvent(event);

          channel.ack(msg);
        } catch (error: any) {
          console.error('[System Prompt Worker] Error processing message:', error.message);
          channel.nack(msg, false, true);
        }
      });
    } catch (error: any) {
      console.error('[System Prompt Worker] Failed to start:', error.message);
    }
  }

  /**
   * Purpose: Fetch full work item data for condition evaluation
   */
  private async fetchWorkItemData(eventData: EventData): Promise<any | null> {
    try {
      if (!eventData.work_item_id || !eventData.org_id) {
        return null;
      }

      const workItemId = Number(eventData.work_item_id);
      const orgId = Number(eventData.org_id);

      const fullData = await this.workItemsService.getFullData(workItemId, orgId);
      return fullData;
    } catch (error: any) {
      console.error('[System Prompt Worker] Failed to fetch work item data:', error.message);
      return null;
    }
  }

  /**
   * Purpose: Route event to appropriate handler based on actionType
   */
  private async processEvent(event: DomainEvent): Promise<void> {
    try {
      switch (event.actionType) {
        case 'work_item':
          await this.handleWorkItemEvent(event);
          break;

        case 'system_prompt':
          await this.handleSystemPromptEvent(event);
          break;

        default:
          console.warn(`[System Prompt Worker] Unknown actionType: ${event.actionType}`);
      }
    } catch (error: any) {
      console.error('[System Prompt Worker] Error processing event:', error.message);
    }
  }

  /**
   * Purpose: Handle work_item events - evaluate conditions and trigger prompts
   */
  private async handleWorkItemEvent(event: DomainEvent): Promise<void> {
    try {
      const eventData = event.data;
      const matchedPrompts = await this.matcher.matchEvent(eventData);

      if (matchedPrompts.length === 0) {
        console.log(`[System Prompt Worker] ❌ No prompts matched for ${eventData.entity}.${eventData.action}`);
        return;
      }

      console.log(`[System Prompt Worker] ✅ Found ${matchedPrompts.length} matching prompt(s)`);

      // Fetch full work item data for condition evaluation
      const workItemData = await this.fetchWorkItemData(eventData);

      for (const prompt of matchedPrompts) {
        console.log(`\n[System Prompt Worker] 🔍 Evaluating prompt: "${prompt.name}"`);
        
        const conditionPassed = this.evaluator.evaluate(prompt.conditionCode, { 
          event: eventData,
          workItemData 
        });

        if (conditionPassed) {
          console.log(`[System Prompt Worker] ✅ CONDITION MATCHED for: "${prompt.name}"`);
          console.log(`[System Prompt Worker] 📝 Prompt Template: ${prompt.promptTemplate}`);
          // TODO: Execute AI with prompt template
        } else {
          console.log(`[System Prompt Worker] ❌ Condition failed for: "${prompt.name}"`);
        }
      }
    } catch (error: any) {
      console.error('[System Prompt Worker] Error handling work_item event:', error.message);
    }
  }

  /**
   * Purpose: Handle system_prompt events - AI generates/validates condition code
   */
  private async handleSystemPromptEvent(event: DomainEvent): Promise<void> {
    try {
      const { action, entity_id, org_id, name, eventType, promptTemplate } = event.data;

      if (action !== 'create' && action !== 'update') {
        console.log(`[System Prompt Worker] ⏭️ Skipping ${action} action for system_prompt`);
        return;
      }

      console.log(`[System Prompt Worker] 🤖 Processing system_prompt ${action}: "${name}"`);
      console.log(`[System Prompt Worker] 🎯 Event Type: ${eventType}`);

      // TODO: Call AI to generate complete system prompt payload
      // const aiPayload = await this.aiGenerateSystemPrompt({
      //   name: name!,
      //   eventType: eventType!,
      //   promptTemplate: promptTemplate!
      // });
      
      // TODO: Update system prompt with AI-generated conditionCode
      // await this.systemPromptsService.update(
      //   Number(entity_id),
      //   Number(org_id),
      //   1, // system user
      //   { conditionCode: aiPayload.conditionCode }
      // );

      console.log('[System Prompt Worker] ⚠️ AI condition generation not yet implemented');
      console.log('[System Prompt Worker] 💡 Will generate condition based on prompt template');
    } catch (error: any) {
      console.error('[System Prompt Worker] Error handling system_prompt event:', error.message);
    }
  }
}

/**
 * Purpose: Initialize and start the worker
 */
export async function startSystemPromptWorker(): Promise<void> {
  const worker = new SystemPromptWorker();
  await worker.start();
}
