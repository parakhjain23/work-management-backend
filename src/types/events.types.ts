/**
 * Purpose: Define domain event structure for system prompt triggers
 * Used by event dispatcher to emit standardized events across the application
 */

export type ActionType = 'work_item' | 'system_prompt';

export interface EventData {
  // Entity identification
  entity: 'work_item' | 'category' | 'system_prompt';
  action: 'create' | 'update' | 'delete';
  entity_id: string;
  work_item_id: string;
  org_id: string;
  category_id: string | null;
  
  // Change tracking
  changedFields: string[];
  fieldChanges: Record<string, FieldChange>;
  
  // Metadata
  triggered_by: 'user' | 'system';
  timestamp: string;
  
  // Optional system prompt fields (only present for system_prompt events)
  name?: string;
  eventType?: string;
  conditionCode?: string;
  promptTemplate?: string;
}

export interface DomainEvent {
  actionType: ActionType;
  data: EventData;
}

export interface FieldChange {
  oldValue: any;
  newValue: any;
  fieldType: 'standard_field' | 'custom_field';
}
