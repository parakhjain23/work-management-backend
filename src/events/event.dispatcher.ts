// Event Dispatcher - Single hook point for all mutation events
// Triggers: RAG Producer, System Prompts, Future Automation

export enum EntityType {
  WORK_ITEM = 'work_item',
  CATEGORY = 'category',
  CUSTOM_FIELD_META = 'custom_field_meta',
  CUSTOM_FIELD_VALUE = 'custom_field_value'
}

export enum ActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

export interface MutationEvent {
  entity: EntityType;
  action: ActionType;
  entity_id: number | number;
  changed_fields?: string[];
  metadata?: any;
  org_id?: number | number;
  user_id?: number | number;
}

export class EventDispatcher {
  private static instance: EventDispatcher;

  private constructor() {}

  public static getInstance(): EventDispatcher {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new EventDispatcher();
    }
    return EventDispatcher.instance;
  }

  /**
   * Dispatch mutation event to all subscribers
   * This is the SINGLE hook point for:
   * - RAG Producer
   * - System Prompts
   * - Future Automation
   */
  public async dispatch(event: MutationEvent): Promise<void> {
    console.log('[Event Dispatcher] Event:', JSON.stringify(event));

    // Execute all handlers asynchronously (don't block response)
    setImmediate(async () => {
      try {
        // 1. Trigger RAG Producer
        await this.triggerRagProducer(event);

        // 2. Trigger System Prompts
        await this.triggerSystemPrompts(event);

        // 3. Future: Webhooks, notifications, etc.
      } catch (error) {
        console.error('[Event Dispatcher] Error processing event:', error);
      }
    });
  }

  /**
   * Trigger RAG Producer for indexing
   */
  private async triggerRagProducer(event: MutationEvent): Promise<void> {
    try {
      // Only trigger RAG for work_item and related entities
      if (event.entity === EntityType.WORK_ITEM || 
          event.entity === EntityType.CUSTOM_FIELD_VALUE ||
          event.entity === EntityType.CATEGORY ||
          event.entity === EntityType.CUSTOM_FIELD_META) {
        
        const { RagProducer } = await import('../rag/rag.producer.js');
        const ragProducer = new RagProducer();

        // Convert to legacy event format for RagProducer
        const legacyEvent = {
          entity_type: event.entity,
          action: event.action.toUpperCase() as 'CREATE' | 'UPDATE' | 'DELETE',
          entity_id: event.entity_id,
          sql: undefined // No SQL available in intent-based flow
        };

        await ragProducer.handleEvent(legacyEvent);
      }
    } catch (error) {
      console.error('[Event Dispatcher] RAG Producer error:', error);
    }
  }

  /**
   * Trigger System Prompts (placeholder)
   */
  private async triggerSystemPrompts(event: MutationEvent): Promise<void> {
    try {
      const { SystemPromptRunner } = await import('../systemPrompts/runner.js');
      const runner = new SystemPromptRunner();
      await runner.processEvent(event);
    } catch (error) {
      console.error('[Event Dispatcher] System Prompt error:', error);
    }
  }

  /**
   * Helper to create work item event
   */
  public static workItemEvent(
    action: ActionType,
    workItemId: number | number,
    changedFields?: string[],
    metadata?: any
  ): MutationEvent {
    return {
      entity: EntityType.WORK_ITEM,
      action,
      entity_id: workItemId,
      changed_fields: changedFields,
      metadata
    };
  }

  /**
   * Helper to create category event
   */
  public static categoryEvent(
    action: ActionType,
    categoryId: number | number,
    changedFields?: string[],
    metadata?: any
  ): MutationEvent {
    return {
      entity: EntityType.CATEGORY,
      action,
      entity_id: categoryId,
      changed_fields: changedFields,
      metadata
    };
  }

  /**
   * Helper to create custom field value event
   */
  public static customFieldValueEvent(
    action: ActionType,
    workItemId: number | number,
    changedFields?: string[],
    metadata?: any
  ): MutationEvent {
    return {
      entity: EntityType.CUSTOM_FIELD_VALUE,
      action,
      entity_id: workItemId,
      changed_fields: changedFields,
      metadata
    };
  }

  /**
   * Helper to create custom field meta event
   */
  public static customFieldMetaEvent(
    action: ActionType,
    fieldId: number | number,
    changedFields?: string[],
    metadata?: any
  ): MutationEvent {
    return {
      entity: EntityType.CUSTOM_FIELD_META,
      action,
      entity_id: fieldId,
      changed_fields: changedFields,
      metadata
    };
  }
}
