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
   * Purpose: Emit event to RabbitMQ exchange
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

      // Publish to RabbitMQ exchange (async, don't block)
      setImmediate(async () => {
        try {
          const { publishDomainEvent } = await import('./event.publisher.js');
          await publishDomainEvent(event);
        } catch (error) {
          console.error('[Event Dispatcher] Failed to publish event:', error);
          // Don't throw - event publishing must not break API response
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
