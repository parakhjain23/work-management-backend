/**
 * Purpose: Domain Event Dispatcher for System Prompt triggers
 * Emits events in DomainEvent format with full change tracking
 */

import { DomainEvent, FieldChange } from '../types/events.types.js';

export type TriggerSource = 'user' | 'system';

/**
 * Purpose: Singleton domain event dispatcher for system prompts
 */
export class DomainEventDispatcher {
  private static instance: DomainEventDispatcher;

  private constructor() {
    console.log('[Domain Event Dispatcher] Initialized');
  }

  /**
   * Purpose: Get singleton instance
   */
  public static getInstance(): DomainEventDispatcher {
    if (!DomainEventDispatcher.instance) {
      DomainEventDispatcher.instance = new DomainEventDispatcher();
    }
    return DomainEventDispatcher.instance;
  }

  /**
   * Purpose: Emit domain event to RabbitMQ exchange
   * This is the ONLY method that should be called to emit domain events
   * 
   * @param event - Domain event object
   */
  public async emit(event: DomainEvent): Promise<void> {
    try {
      // Validate event shape
      this.validateEvent(event);

      // Convert BigInt to string for logging
      const loggableEvent = this.serializeEvent(event);

      // Log event
      console.log('[Domain Event Dispatcher] Event emitted:', JSON.stringify(loggableEvent, null, 2));

      // Publish to RabbitMQ exchange (async, don't block)
      setImmediate(async () => {
        try {
          const { publishDomainEvent } = await import('./domain.event.publisher.js');
          await publishDomainEvent(event);
        } catch (error) {
          console.error('[Domain Event Dispatcher] Failed to publish event:', error);
          // Don't throw - event publishing must not break API response
        }
      });
    } catch (error) {
      // Log error but don't throw - don't break the response
      console.error('[Domain Event Dispatcher] Event emission error:', error);
    }
  }

  /**
   * Purpose: Validate event structure
   */
  private validateEvent(event: DomainEvent): void {
    if (!event.entity) throw new Error('Event must have entity field');
    if (!event.action) throw new Error('Event must have action field');
    if (!event.entity_id) throw new Error('Event must have entity_id field');
    
    // work_item_id is optional for category events
    if (event.entity !== 'category' && !event.work_item_id) {
      throw new Error('Event must have work_item_id field');
    }
    
    if (!event.org_id) throw new Error('Event must have org_id field');
    if (!event.triggered_by) throw new Error('Event must have triggered_by field');
    if (!event.timestamp) throw new Error('Event must have timestamp field');

    const validEntities = ['work_item', 'custom_field_value', 'category'];
    if (!validEntities.includes(event.entity)) {
      throw new Error(`Invalid entity type: ${event.entity}`);
    }

    const validActions = ['create', 'update', 'delete'];
    if (!validActions.includes(event.action)) {
      throw new Error(`Invalid action type: ${event.action}`);
    }
  }

  /**
   * Purpose: Convert BigInt to string for JSON serialization
   */
  private serializeEvent(event: DomainEvent): any {
    return JSON.parse(JSON.stringify(event, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  }

  /**
   * Purpose: Helper to create work_item domain event
   */
  public static workItemEvent(
    action: 'create' | 'update' | 'delete',
    workItemId: number,
    orgId: number,
    categoryId: number | null,
    triggeredBy: TriggerSource,
    changedFields: string[] = [],
    fieldChanges: Record<string, FieldChange> = {}
  ): DomainEvent {
    return {
      entity: 'work_item',
      action,
      entity_id: workItemId.toString(),
      work_item_id: workItemId.toString(),
      org_id: orgId.toString(),
      category_id: categoryId?.toString() || '',
      changedFields,
      fieldChanges,
      triggered_by: triggeredBy,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Purpose: Helper to create custom_field_value domain event
   * Note: Custom field changes emit work_item.update events since they belong to work items
   */
  public static customFieldValueEvent(
    action: 'create' | 'update' | 'delete',
    valueId: number,
    workItemId: number,
    orgId: number,
    categoryId: number | null,
    triggeredBy: TriggerSource,
    changedFields: string[] = [],
    fieldChanges: Record<string, FieldChange> = {}
  ): DomainEvent {
    return {
      entity: 'work_item',
      action,
      entity_id: workItemId.toString(),
      work_item_id: workItemId.toString(),
      org_id: orgId.toString(),
      category_id: categoryId?.toString() || '',
      changedFields,
      fieldChanges,
      triggered_by: triggeredBy,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Purpose: Helper to create category domain event
   */
  public static categoryEvent(
    action: 'create' | 'update' | 'delete',
    categoryId: number,
    orgId: number,
    triggeredBy: TriggerSource,
    changedFields: string[] = [],
    fieldChanges: Record<string, FieldChange> = {}
  ): DomainEvent {
    return {
      entity: 'category',
      action,
      entity_id: categoryId.toString(),
      work_item_id: '', // Categories don't have work items
      org_id: orgId.toString(),
      category_id: categoryId.toString(),
      changedFields,
      fieldChanges,
      triggered_by: triggeredBy,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Purpose: Export singleton instance for easy access
 */
export const domainEventDispatcher = DomainEventDispatcher.getInstance();
