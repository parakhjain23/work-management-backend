/**
 * Purpose: Safely evaluate JavaScript condition code
 * Executes user-defined conditions in a sandboxed environment
 */

import { EventData } from '../types/events.types.js';

export interface EvaluationContext {
  actionType: string;
  event: EventData;
  workItemData?: any;
}

export class ConditionEvaluator {
  /**
   * Purpose: Evaluate condition code against event data
   * Returns true if condition passes, false otherwise
   */
  evaluate(conditionCode: string, context: EvaluationContext): boolean {
    try {
      // If no condition code, return true (event-only trigger)
      if (!conditionCode || conditionCode.trim() === '') {
        console.log('[Condition Evaluator] No condition code - returning true (event-only trigger)');
        return true;
      }

      // Build data object with event fields + full work item data
      const data: any = {
        // Event fields (for matching event type and changed fields)
        actionType: context.actionType,
        entity: context.event.entity,
        action: context.event.action,
        changedFields: context.event.changedFields,
        fieldChanges: context.event.fieldChanges,
        triggered_by: context.event.triggered_by,
        work_item_id: context.event.work_item_id,
        org_id: context.event.org_id,
        category_id: context.event.category_id
      };

      // Add full work item data if available (for checking category, customFields, etc.)
      if (context.workItemData) {
        // New API format: workItemData is already the full object with all fields at root level
        // Put all fields directly in data object (not nested under workItem)
        data.id = context.workItemData.id;
        data.title = context.workItemData.title;
        data.description = context.workItemData.description;
        data.status = context.workItemData.status;
        data.priority = context.workItemData.priority;
        data.categoryId = context.workItemData.categoryId;
        data.assigneeId = context.workItemData.assigneeId;
        data.createdBy = context.workItemData.createdBy;
        data.updatedBy = context.workItemData.updatedBy;
        data.startDate = context.workItemData.startDate;
        data.dueDate = context.workItemData.dueDate;
        data.parentId = context.workItemData.parentId;
        data.rootParentId = context.workItemData.rootParentId;
        data.externalId = context.workItemData.externalId;
        data.docId = context.workItemData.docId;
        data.createdAt = context.workItemData.createdAt;
        data.updatedAt = context.workItemData.updatedAt;
        data.category = context.workItemData.category;
        data.customFields = context.workItemData.customFields;
        data.customFieldsMetadata = context.workItemData.customFieldsMetadata;
      }
      const conditionFunction = new Function('data', `
        'use strict';
        try {
          return Boolean(${conditionCode});
        } catch (error) {
          console.error('[Condition Evaluator] Error in condition:', error.message);
          return false;
        }
      `);
      console.log("aryan checking!")
        console.log(data)
      const result = conditionFunction(data);
      
      console.log(`[Condition Evaluator] Condition: ${conditionCode}`);
      console.log(`[Condition Evaluator] Result: ${result}`);
      
      return result;
    } catch (error: any) {
      console.error('[Condition Evaluator] Failed to evaluate condition:', error.message);
      return false;
    }
  }

  /**
   * Purpose: Validate condition code syntax
   * Returns error message if invalid, null if valid
   */
  validateSyntax(conditionCode: string): string | null {
    try {
      new Function('data', `return Boolean(${conditionCode})`);
      return null;
    } catch (error: any) {
      return error.message;
    }
  }
}
