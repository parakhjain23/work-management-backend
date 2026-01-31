import { WorkItemStatus, WorkItemPriority } from '@prisma/client';

// Intent types that AI can execute
export enum IntentType {
  CREATE_WORK_ITEM = 'create_work_item',
  UPDATE_WORK_ITEM = 'update_work_item',
  DELETE_WORK_ITEM = 'delete_work_item',
  ADD_CHILD_WORK_ITEM = 'add_child_work_item',
  CREATE_CATEGORY = 'create_category',
  UPDATE_CATEGORY = 'update_category',
  CREATE_CUSTOM_FIELD = 'create_custom_field',
  UPDATE_CUSTOM_FIELD_VALUE = 'update_custom_field_value',
  UPDATE_WORK_ITEM_STATUS = 'update_work_item_status'
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
  };
}

export interface DeleteWorkItemPayload {
  work_item_id: number;
}

export interface AddChildWorkItemPayload {
  parent_id: number;
  title: string;
  description?: string;
  priority?: WorkItemPriority;
  status?: WorkItemStatus;
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

export interface CreateCustomFieldPayload {
  category_id: number;
  name: string;
  key_name: string;
  data_type: 'text' | 'number' | 'boolean' | 'json';
  description?: string;
  enums?: string;
  meta?: any;
}

export interface UpdateCustomFieldValuePayload {
  work_item_id: number;
  values: {
    [key_name: string]: any;
  };
}

export interface UpdateWorkItemStatusPayload {
  work_item_id: number;
  status: WorkItemStatus;
}

// Intent response
export interface IntentResponse {
  success: boolean;
  result?: {
    type: string;
    id?: number | bigint;
    data?: any;
  };
  error?: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  error?: string;
}
