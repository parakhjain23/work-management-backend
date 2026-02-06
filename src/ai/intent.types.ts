import { WorkItemStatus, WorkItemPriority } from '@prisma/client';

// Intent types that AI can execute
// Value-based operations: work_item.* (affects work item field values including custom fields)
// Entity-based operations: category.*, custom_field_meta.* (creates/modifies entities)
export enum IntentType {
  // Work Item Value Operations (includes custom field values)
  CREATE_WORK_ITEM = 'work_item.create',
  UPDATE_WORK_ITEM = 'work_item.update',
  DELETE_WORK_ITEM = 'work_item.delete',
  
  // Category Entity Operations
  CREATE_CATEGORY = 'category.create',
  UPDATE_CATEGORY = 'category.update',
  DELETE_CATEGORY = 'category.delete',
  
  // Custom Field Metadata Operations
  CREATE_CUSTOM_FIELD_META = 'custom_field_meta.create',
  UPDATE_CUSTOM_FIELD_META = 'custom_field_meta.update',
  DELETE_CUSTOM_FIELD_META = 'custom_field_meta.delete'
}

// Base intent request
export interface IntentRequest {
  intent: IntentType;
  payload: any;
  threadId: string;
}

// Payload contracts for each intent
export interface CreateWorkItemPayload {
  title: string;
  category_id?: number;
  description?: string;
  priority?: WorkItemPriority;
  status?: WorkItemStatus;
  assignee_id?: number;
  start_date?: string;
  due_date?: string;
  parent_id?: number;
  root_parent_id?: number;
  external_id?: string;
  created_by?: number;
  custom_field_values?: {
    [key_name: string]: any;
  };
}

export interface UpdateWorkItemPayload {
  work_item_id: number;
  fields: {
    title?: string;
    description?: string;
    status?: WorkItemStatus;
    priority?: WorkItemPriority;
    category_id?: number;
    assignee_id?: number | null;
    start_date?: string | null;
    due_date?: string | null;
    external_id?: string | null;
    created_by?: number | null;
    parent_id?: number | null;
    root_parent_id?: number | null;
    doc_id?: string | null;
    custom_field_values?: {
      [key_name: string]: any;
    };
  };
}

export interface DeleteWorkItemPayload {
  work_item_id: number;
}

export interface DeleteCategoryPayload {
  category_id: number;
}

export interface CreateCategoryPayload {
  key_name: string;
  name: string;
  external_tool?: string;
}

export interface UpdateCategoryPayload {
  category_id: number;
  fields: {
    name?: string;
    external_tool?: string;
  };
}

export interface CreateCustomFieldMetaPayload {
  category_id: number;
  name: string;
  key_name: string;
  data_type: 'text' | 'number' | 'boolean' | 'json';
  description?: string;
  enums?: string;
  meta?: any;
}

export interface UpdateCustomFieldMetaPayload {
  custom_field_meta_id: number;
  fields: {
    name?: string;
    description?: string;
    enums?: string;
    meta?: any;
  };
}

export interface DeleteCustomFieldMetaPayload {
  custom_field_meta_id: number;
}

// Intent response
export interface IntentResponse {
  success: boolean;
  result?: {
    type: string;
    id?: number | number;
    data?: any;
  };
  error?: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  error?: string;
}
