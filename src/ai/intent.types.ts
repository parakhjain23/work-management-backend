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
  description?: string;
  category_id?: number;
  priority?: WorkItemPriority;
  status?: WorkItemStatus;
  assignee_id?: number;
  due_date?: string;
  start_date?: string;
}

export interface UpdateWorkItemPayload {
  work_item_id: number;
  fields: {
    title?: string;
    description?: string;
    status?: WorkItemStatus;
    priority?: WorkItemPriority;
    category_id?: number;
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
