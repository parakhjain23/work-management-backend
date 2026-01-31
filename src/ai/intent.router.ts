// Intent Router - Routes AI intents to appropriate service methods
// Validates payload shape and enforces threadId scope

import {
  IntentType,
  IntentRequest,
  IntentResponse,
  ValidationResult,
  CreateWorkItemPayload,
  UpdateWorkItemPayload,
  DeleteWorkItemPayload,
  AddChildWorkItemPayload,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CreateCustomFieldPayload,
  UpdateCustomFieldValuePayload,
  UpdateWorkItemStatusPayload
} from './intent.types.js';
import { WorkItemsService } from '../services/workItems.service.js';
import { CategoriesService } from '../services/categories.service.js';
import { CustomFieldsService } from '../services/customFields.service.js';

export class IntentRouter {
  private workItemsService: WorkItemsService;
  private categoriesService: CategoriesService;
  private customFieldsService: CustomFieldsService;

  constructor() {
    this.workItemsService = new WorkItemsService();
    this.categoriesService = new CategoriesService();
    this.customFieldsService = new CustomFieldsService();
  }

  /**
   * Route intent to appropriate handler
   */
  public async route(request: IntentRequest, orgId: bigint, userId: bigint): Promise<IntentResponse> {
    try {
      // Validate intent type
      if (!Object.values(IntentType).includes(request.intent)) {
        return {
          success: false,
          error: `Invalid intent type: ${request.intent}`
        };
      }

      // Validate threadId scope
      const scopeValidation = this.validateThreadScope(request.threadId, request.intent, request.payload);
      if (!scopeValidation.valid) {
        return {
          success: false,
          error: scopeValidation.error
        };
      }

      // Route to handler
      switch (request.intent) {
        case IntentType.CREATE_WORK_ITEM:
          return await this.handleCreateWorkItem(request.payload, orgId, userId);
        
        case IntentType.UPDATE_WORK_ITEM:
          return await this.handleUpdateWorkItem(request.payload, orgId, userId);
        
        case IntentType.DELETE_WORK_ITEM:
          return await this.handleDeleteWorkItem(request.payload, orgId, userId);
        
        case IntentType.ADD_CHILD_WORK_ITEM:
          return await this.handleAddChildWorkItem(request.payload, orgId, userId);
        
        case IntentType.CREATE_CATEGORY:
          return await this.handleCreateCategory(request.payload, orgId, userId);
        
        case IntentType.UPDATE_CATEGORY:
          return await this.handleUpdateCategory(request.payload, orgId, userId);
        
        case IntentType.CREATE_CUSTOM_FIELD:
          return await this.handleCreateCustomField(request.payload, orgId, userId);
        
        case IntentType.UPDATE_CUSTOM_FIELD_VALUE:
          return await this.handleUpdateCustomFieldValue(request.payload, orgId, userId);
        
        case IntentType.UPDATE_WORK_ITEM_STATUS:
          return await this.handleUpdateWorkItemStatus(request.payload, orgId, userId);
        
        default:
          return {
            success: false,
            error: `Unhandled intent: ${request.intent}`
          };
      }
    } catch (error) {
      console.error('[Intent Router] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Intent execution failed'
      };
    }
  }

  /**
   * Validate threadId scope
   * threadId must be numeric: workItemId or orgId
   */
  private validateThreadScope(threadId: string, intent: IntentType, payload: any): ValidationResult {
    if (!threadId || threadId.trim() === '') {
      return { valid: false, error: 'threadId is required' };
    }

    // threadId must be numeric (workItemId or orgId)
    if (!/^\d+$/.test(threadId)) {
      return { 
        valid: false, 
        error: 'threadId must be numeric (workItemId or orgId)' 
      };
    }

    return { valid: true };
  }

  /**
   * CREATE_WORK_ITEM handler
   */
  private async handleCreateWorkItem(
    payload: CreateWorkItemPayload,
    orgId: bigint,
    userId: bigint
  ): Promise<IntentResponse> {
    // Validate payload
    if (!payload.title) {
      return { success: false, error: 'title is required' };
    }

    // Execute service
    const workItem = await this.workItemsService.create(orgId, userId, {
      title: payload.title,
      categoryId: payload.category_id ? BigInt(payload.category_id) : undefined,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      assigneeId: payload.assignee_id ? BigInt(payload.assignee_id) : undefined,
      startDate: payload.start_date ? new Date(payload.start_date) : undefined,
      dueDate: payload.due_date ? new Date(payload.due_date) : undefined,
      parentId: payload.parent_id ? BigInt(payload.parent_id) : undefined,
      rootParentId: payload.root_parent_id ? BigInt(payload.root_parent_id) : undefined,
      externalId: payload.external_id,
      createdBy: payload.created_by ? BigInt(payload.created_by) : undefined
    });

    // Event is emitted by service layer
    return {
      success: true,
      result: {
        type: 'work_item_created',
        id: workItem.id,
        data: workItem
      }
    };
  }

  /**
   * UPDATE_WORK_ITEM handler
   */
  private async handleUpdateWorkItem(
    payload: UpdateWorkItemPayload,
    orgId: bigint,
    userId: bigint
  ): Promise<IntentResponse> {
    // Validate payload
    if (!payload.work_item_id) {
      return { success: false, error: 'work_item_id is required' };
    }

    if (!payload.fields || Object.keys(payload.fields).length === 0) {
      return { success: false, error: 'fields object is required' };
    }

    const workItemId = BigInt(payload.work_item_id);

    // Execute service
    const workItem = await this.workItemsService.update(workItemId, orgId, userId, {
      title: payload.fields.title,
      description: payload.fields.description,
      status: payload.fields.status,
      priority: payload.fields.priority,
      categoryId: payload.fields.category_id ? BigInt(payload.fields.category_id) : undefined,
      assigneeId: payload.fields.assignee_id !== undefined ? (payload.fields.assignee_id ? BigInt(payload.fields.assignee_id) : null) : undefined,
      startDate: payload.fields.start_date !== undefined ? (payload.fields.start_date ? new Date(payload.fields.start_date) : null) : undefined,
      dueDate: payload.fields.due_date !== undefined ? (payload.fields.due_date ? new Date(payload.fields.due_date) : null) : undefined,
      externalId: payload.fields.external_id !== undefined ? payload.fields.external_id : undefined,
      createdBy: payload.fields.created_by !== undefined ? (payload.fields.created_by ? BigInt(payload.fields.created_by) : null) : undefined,
      parentId: payload.fields.parent_id !== undefined ? (payload.fields.parent_id ? BigInt(payload.fields.parent_id) : null) : undefined,
      rootParentId: payload.fields.root_parent_id !== undefined ? (payload.fields.root_parent_id ? BigInt(payload.fields.root_parent_id) : null) : undefined,
      docId: payload.fields.doc_id !== undefined ? payload.fields.doc_id : undefined
    });

    // Event is emitted by service layer
    return {
      success: true,
      result: {
        type: 'work_item_updated',
        id: workItem.id,
        data: workItem
      }
    };
  }

  /**
   * DELETE_WORK_ITEM handler
   */
  private async handleDeleteWorkItem(
    payload: DeleteWorkItemPayload,
    orgId: bigint,
    userId: bigint
  ): Promise<IntentResponse> {
    if (!payload.work_item_id) {
      return { success: false, error: 'work_item_id is required' };
    }

    const workItemId = BigInt(payload.work_item_id);

    // Execute service
    await this.workItemsService.delete(workItemId, orgId);

    // Event is emitted by service layer
    return {
      success: true,
      result: {
        type: 'work_item_deleted',
        id: workItemId
      }
    };
  }

  /**
   * ADD_CHILD_WORK_ITEM handler
   */
  private async handleAddChildWorkItem(
    payload: AddChildWorkItemPayload,
    orgId: bigint,
    userId: bigint
  ): Promise<IntentResponse> {
    if (!payload.parent_id) {
      return { success: false, error: 'parent_id is required' };
    }

    if (!payload.title) {
      return { success: false, error: 'title is required' };
    }

    const parentId = BigInt(payload.parent_id);

    // Execute service
    const workItem = await this.workItemsService.createChild(parentId, orgId, userId, {
      categoryId: BigInt(0), // Will be inherited from parent
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority
    });

    // Event is emitted by service layer (create method)
    return {
      success: true,
      result: {
        type: 'child_work_item_created',
        id: workItem.id,
        data: workItem
      }
    };
  }

  /**
   * CREATE_CATEGORY handler
   */
  private async handleCreateCategory(
    payload: CreateCategoryPayload,
    orgId: bigint,
    userId: bigint
  ): Promise<IntentResponse> {
    if (!payload.key_name || !payload.name) {
      return { success: false, error: 'key_name and name are required' };
    }

    // Execute service
    const category = await this.categoriesService.create(orgId, userId, {
      keyName: payload.key_name,
      name: payload.name,
      externalTool: payload.external_tool
    });

    // Event is emitted by service layer
    return {
      success: true,
      result: {
        type: 'category_created',
        id: category.id,
        data: category
      }
    };
  }

  /**
   * UPDATE_CATEGORY handler
   */
  private async handleUpdateCategory(
    payload: UpdateCategoryPayload,
    orgId: bigint,
    userId: bigint
  ): Promise<IntentResponse> {
    if (!payload.category_id) {
      return { success: false, error: 'category_id is required' };
    }

    if (!payload.fields || Object.keys(payload.fields).length === 0) {
      return { success: false, error: 'fields object is required' };
    }

    const categoryId = BigInt(payload.category_id);

    // Execute service
    const category = await this.categoriesService.update(categoryId, orgId, userId, {
      name: payload.fields.name,
      externalTool: payload.fields.external_tool
    });

    // Event is emitted by service layer
    return {
      success: true,
      result: {
        type: 'category_updated',
        id: category.id,
        data: category
      }
    };
  }

  /**
   * CREATE_CUSTOM_FIELD handler
   */
  private async handleCreateCustomField(
    payload: CreateCustomFieldPayload,
    orgId: bigint,
    userId: bigint
  ): Promise<IntentResponse> {
    if (!payload.category_id || !payload.name || !payload.key_name || !payload.data_type) {
      return { success: false, error: 'category_id, name, key_name, and data_type are required' };
    }

    const categoryId = BigInt(payload.category_id);

    // Execute service
    const field = await this.customFieldsService.createMeta(categoryId, orgId, userId, {
      name: payload.name,
      keyName: payload.key_name,
      dataType: payload.data_type as any,
      description: payload.description,
      enums: payload.enums,
      meta: payload.meta
    });

    // Event is emitted by service layer
    return {
      success: true,
      result: {
        type: 'custom_field_created',
        id: field.id,
        data: field
      }
    };
  }

  /**
   * UPDATE_CUSTOM_FIELD_VALUE handler
   */
  private async handleUpdateCustomFieldValue(
    payload: UpdateCustomFieldValuePayload,
    orgId: bigint,
    userId: bigint
  ): Promise<IntentResponse> {
    if (!payload.work_item_id) {
      return { success: false, error: 'work_item_id is required' };
    }

    if (!payload.values || Object.keys(payload.values).length === 0) {
      return { success: false, error: 'values object is required' };
    }

    const workItemId = BigInt(payload.work_item_id);

    // Execute service
    const values = await this.customFieldsService.updateValues(workItemId, orgId, payload.values);

    // Event is emitted by service layer
    return {
      success: true,
      result: {
        type: 'custom_field_values_updated',
        id: workItemId,
        data: values
      }
    };
  }

  /**
   * UPDATE_WORK_ITEM_STATUS handler (convenience intent)
   */
  private async handleUpdateWorkItemStatus(
    payload: UpdateWorkItemStatusPayload,
    orgId: bigint,
    userId: bigint
  ): Promise<IntentResponse> {
    if (!payload.work_item_id || !payload.status) {
      return { success: false, error: 'work_item_id and status are required' };
    }

    const workItemId = BigInt(payload.work_item_id);

    // Execute service
    const workItem = await this.workItemsService.update(workItemId, orgId, userId, {
      status: payload.status
    });

    // Event is emitted by service layer
    return {
      success: true,
      result: {
        type: 'work_item_status_updated',
        id: workItem.id,
        data: workItem
      }
    };
  }
}
