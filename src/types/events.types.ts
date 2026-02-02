/**
 * Purpose: Define domain event structure for system prompt triggers
 * Used by event dispatcher to emit standardized events across the application
 */

export interface DomainEvent {
  // Entity identification
  entity: 'work_item' | 'custom_field_value' | 'category';
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
}

export interface FieldChange {
  oldValue: any;
  newValue: any;
  fieldType: 'standard_field' | 'custom_field';
}
