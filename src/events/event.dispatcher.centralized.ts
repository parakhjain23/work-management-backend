/**
 * Purpose: Centralized Event Dispatcher for all CUD operations
 * Single source of truth for event emission across the system
 * Events are emitted ONLY from service layer after successful DB mutations
 */

export type EntityType = 'work_item' | 'category' | 'custom_field' | 'custom_field_value';
export type ActionType = 'create' | 'update' | 'delete';
export type TriggerSource = 'user' | 'ai' | 'system';

/**
 * Standard event shape - ALL events must follow this structure
 */
export interface StandardEvent {
  entity: EntityType;
  action: ActionType;
  entity_id: number | bigint;
  parent_id?: number | bigint;
  changed_fields?: string[];
  triggered_by: TriggerSource;
  timestamp: string;
  metadata?: any;
}

/**
 * Purpose: Singleton event dispatcher
 * Ensures single instance across application
 */
export class CentralizedEventDispatcher {
  private static instance: CentralizedEventDispatcher;

  private constructor() {
    console.log('[Event Dispatcher] Initialized');
  }

  /**
   * Purpose: Get singleton instance
   */
  public static getInstance(): CentralizedEventDispatcher {
    if (!CentralizedEventDispatcher.instance) {
      CentralizedEventDispatcher.instance = new CentralizedEventDispatcher();
    }
    return CentralizedEventDispatcher.instance;
  }

  /**
   * Purpose: Emit event to all subscribers
   * This is the ONLY method that should be called to emit events
   * 
   * @param event - Standard event object
   */
  public async emit(event: StandardEvent): Promise<void> {
    try {
      // Validate event shape
      this.validateEvent(event);

      // Convert BigInt to string for logging
      const loggableEvent = this.serializeEvent(event);

      // Log event
      console.log('[Event Dispatcher] Event emitted:', JSON.stringify(loggableEvent, null, 2));

      // Fan out to subscribers (async, don't block)
      setImmediate(async () => {
        try {
          await this.fanOut(event);
        } catch (error) {
          console.error('[Event Dispatcher] Fan-out error:', error);
          // Don't throw - event consumers must be resilient
        }
      });
    } catch (error) {
      // Log error but don't throw - don't break the response
      console.error('[Event Dispatcher] Event emission error:', error);
    }
  }

  /**
   * Purpose: Validate event structure
   * Ensures all required fields are present
   */
  private validateEvent(event: StandardEvent): void {
    if (!event.entity) {
      throw new Error('Event must have entity field');
    }

    if (!event.action) {
      throw new Error('Event must have action field');
    }

    if (event.entity_id === undefined || event.entity_id === null) {
      throw new Error('Event must have entity_id field');
    }

    if (!event.triggered_by) {
      throw new Error('Event must have triggered_by field');
    }

    if (!event.timestamp) {
      throw new Error('Event must have timestamp field');
    }

    const validEntities: EntityType[] = ['work_item', 'category', 'custom_field', 'custom_field_value'];
    if (!validEntities.includes(event.entity)) {
      throw new Error(`Invalid entity type: ${event.entity}`);
    }

    const validActions: ActionType[] = ['create', 'update', 'delete'];
    if (!validActions.includes(event.action)) {
      throw new Error(`Invalid action type: ${event.action}`);
    }

    const validTriggers: TriggerSource[] = ['user', 'ai', 'system'];
    if (!validTriggers.includes(event.triggered_by)) {
      throw new Error(`Invalid trigger source: ${event.triggered_by}`);
    }
  }

  /**
   * Purpose: Convert BigInt to string for JSON serialization
   */
  private serializeEvent(event: StandardEvent): any {
    return {
      ...event,
      entity_id: event.entity_id.toString(),
      parent_id: event.parent_id ? event.parent_id.toString() : undefined
    };
  }

  /**
   * Purpose: Fan out event to all subscribers
   * Calls system prompt runner and RAG producer (placeholders for now)
   */
  private async fanOut(event: StandardEvent): Promise<void> {
    // 1. System Prompt Runner (placeholder)
    await this.triggerSystemPrompts(event);

    // 2. RAG Producer (placeholder)
    await this.triggerRagProducer(event);

    // 3. Future: Analytics, webhooks, notifications, etc.
  }

  /**
   * Purpose: Trigger system prompts based on event (PLACEHOLDER)
   * Will be implemented when system prompts are ready
   */
  private async triggerSystemPrompts(event: StandardEvent): Promise<void> {
    try {
      console.log('[Event Dispatcher → System Prompts] Would process:', {
        entity: event.entity,
        action: event.action,
        entity_id: event.entity_id.toString(),
        changed_fields: event.changed_fields
      });

      // PLACEHOLDER: No actual execution yet
      // Future: Query system_prompts table and execute matching prompts
    } catch (error) {
      console.error('[Event Dispatcher → System Prompts] Error:', error);
    }
  }

  /**
   * Purpose: Trigger RAG indexing based on event (PLACEHOLDER)
   * Will be implemented when RAG is ready
   */
  private async triggerRagProducer(event: StandardEvent): Promise<void> {
    try {
      // Only trigger RAG for work_item and related entities
      if (event.entity === 'work_item' || 
          event.entity === 'custom_field_value' ||
          event.entity === 'category' ||
          event.entity === 'custom_field') {
        
        console.log('[Event Dispatcher → RAG Producer] Would index:', {
          entity: event.entity,
          action: event.action,
          entity_id: event.entity_id.toString()
        });

        // PLACEHOLDER: No actual RAG API calls yet
        // Future: Call RAG Producer to index/update/delete
      }
    } catch (error) {
      console.error('[Event Dispatcher → RAG Producer] Error:', error);
    }
  }

  /**
   * Purpose: Helper to create work_item event
   */
  public static workItemEvent(
    action: ActionType,
    entityId: number | bigint,
    triggeredBy: TriggerSource,
    changedFields?: string[],
    parentId?: number | bigint
  ): StandardEvent {
    return {
      entity: 'work_item',
      action,
      entity_id: entityId,
      parent_id: parentId,
      changed_fields: changedFields,
      triggered_by: triggeredBy,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Purpose: Helper to create category event
   */
  public static categoryEvent(
    action: ActionType,
    entityId: number | bigint,
    triggeredBy: TriggerSource,
    changedFields?: string[]
  ): StandardEvent {
    return {
      entity: 'category',
      action,
      entity_id: entityId,
      changed_fields: changedFields,
      triggered_by: triggeredBy,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Purpose: Helper to create custom_field event
   */
  public static customFieldEvent(
    action: ActionType,
    entityId: number | bigint,
    triggeredBy: TriggerSource,
    changedFields?: string[]
  ): StandardEvent {
    return {
      entity: 'custom_field',
      action,
      entity_id: entityId,
      changed_fields: changedFields,
      triggered_by: triggeredBy,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Purpose: Helper to create custom_field_value event
   */
  public static customFieldValueEvent(
    action: ActionType,
    workItemId: number | bigint,
    triggeredBy: TriggerSource,
    changedFields?: string[]
  ): StandardEvent {
    return {
      entity: 'custom_field_value',
      action,
      entity_id: workItemId,
      changed_fields: changedFields,
      triggered_by: triggeredBy,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Purpose: Export singleton instance for easy access
 */
export const eventDispatcher = CentralizedEventDispatcher.getInstance();
