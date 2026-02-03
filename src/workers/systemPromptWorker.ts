/**
 * Purpose: RabbitMQ worker to consume domain events
 * Processes events through matcher → evaluator pipeline
 */

import { getRabbitMQChannel } from '../queue/rabbitmq.connection.js';
import { DomainEvent } from '../types/events.types.js';
import { SystemPromptMatcher } from '../services/systemPromptMatcher.service.js';
import { ConditionEvaluator } from '../services/conditionEvaluator.service.js';
import { WorkItemsService } from '../services/workItems.service.js';
import { DOMAIN_EVENTS_EXCHANGE, SYSTEMPROMPT_QUEUE_NAME } from '../queue/queue.types.js';

export class SystemPromptWorker {
  private matcher = new SystemPromptMatcher();
  private evaluator = new ConditionEvaluator();
  private workItemsService = new WorkItemsService();

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
          
          console.log(`\n[System Prompt Worker] 📨 Received event: ${event.entity}.${event.action}`);

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
  private async fetchWorkItemData(event: DomainEvent): Promise<any | null> {
    try {
      if (!event.work_item_id || !event.org_id) {
        return null;
      }

      const workItemId = BigInt(event.work_item_id);
      const orgId = BigInt(event.org_id);

      const fullData = await this.workItemsService.getFullData(workItemId, orgId);
      return fullData;
    } catch (error: any) {
      console.error('[System Prompt Worker] Failed to fetch work item data:', error.message);
      return null;
    }
  }

  /**
   * Purpose: Process a domain event through the system prompt pipeline
   */
  private async processEvent(event: DomainEvent): Promise<void> {
    try {
      const matchedPrompts = await this.matcher.matchEvent(event);

      if (matchedPrompts.length === 0) {
        console.log(`[System Prompt Worker] ❌ No prompts matched for ${event.entity}.${event.action}`);
        return;
      }

      console.log(`[System Prompt Worker] ✅ Found ${matchedPrompts.length} matching prompt(s)`);

      // Fetch full work item data for condition evaluation
      const workItemData = await this.fetchWorkItemData(event);

      for (const prompt of matchedPrompts) {
        console.log(`\n[System Prompt Worker] 🔍 Evaluating prompt: "${prompt.name}" (${prompt.keyName})`);
        
        const conditionPassed = this.evaluator.evaluate(prompt.conditionCode, { 
          event,
          workItemData 
        });

        if (conditionPassed) {
          console.log(`[System Prompt Worker] ✅ CONDITION MATCHED for: "${prompt.name}"`);
          console.log(`[System Prompt Worker] 📝 Prompt Template: ${prompt.promptTemplate}`);
          console.log(`[System Prompt Worker] 🎯 Priority: ${prompt.priority}`);
        } else {
          console.log(`[System Prompt Worker] ❌ Condition failed for: "${prompt.name}"`);
        }
      }
    } catch (error: any) {
      console.error('[System Prompt Worker] Error processing event:', error.message);
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
