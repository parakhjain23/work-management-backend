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

      
      if (eventData.entity === 'work_item' && eventData.action === 'create') {
        // TODO: Call AI to process work item creation (implementation pending)
        console.log('[System Prompt Worker] 🤖 TODO: AI call for work_item.create');
      }

      // System prompt condition matching and event matching...

      const matchedPrompts = await this.matcher.matchEvent(eventData);

      if (matchedPrompts.length === 0) {
        console.log("No matching prompts found!");
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


          // TODO: CALL AI with prompt template (same as workItem create wala)
        } else {
          console.log(`[System Prompt Worker] ❌ Condition failed for: "${prompt.name}"`);
        }
      }
    } catch (error: any) {
      console.error('[System Prompt Worker] Error handling work_item event:', error.message);
    }
  }

  /**
   * Purpose: Handle system_prompt events - AI generates condition code and refines prompt
   */
  private async handleSystemPromptEvent(event: DomainEvent): Promise<void> {
    try {
      const { action, entity_id, org_id } = event.data;
     


      if (action !== 'create' && action !== 'update') {
        console.log(`[System Prompt Worker] ⏭️ Skipping ${action} action for system_prompt`);
        return;
      }

       
      const systemPromptPayload = await this.systemPromptsService.findById(Number(entity_id), Number(org_id));

      if(!systemPromptPayload){
        throw new Error("System prompt doesn't exists")
      }

      console.log(`[System Prompt Worker] 🤖 Processing system_prompt ${action}`);

      // TODO: Call AI to generate conditionCode and refined promptTemplate
      
      // const aiResponse = await systemPromptConditionGeneratorAI(systemPromptPayload);

      // Placeholder AI response for now
      const aiResponse: any = null;

      if (aiResponse) {
        // Update system prompt with AI-generated values
        // The AI response keys match DB column names (conditionCode, promptTemplate, etc.)
        await this.systemPromptsService.update(
          Number(entity_id),
          Number(org_id),
          1, // system user
          aiResponse // Contains: conditionCode, promptTemplate, and optionally conditionLabel
        );

        console.log("udpated system prompt")
      } else {
        console.log('AI call failed');
      }
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
