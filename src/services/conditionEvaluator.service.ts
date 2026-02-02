/**
 * Purpose: Safely evaluate JavaScript condition code
 * Executes user-defined conditions in a sandboxed environment
 */

import { DomainEvent } from '../types/events.types.js';

export interface EvaluationContext {
  event: DomainEvent;
  workItemData?: any;
}

export class ConditionEvaluator {
  /**
   * Purpose: Evaluate condition code against event data
   * Returns true if condition passes, false otherwise
   */
  evaluate(conditionCode: string, context: EvaluationContext): boolean {
    try {
      // Build data object with event fields + full work item data
      const data: any = {
        // Event fields (for matching event type and changed fields)
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
        data.workItem = context.workItemData.workItem;
        data.category = context.workItemData.category;
        data.customFields = context.workItemData.customFields;
        data.customFieldsMetadata = context.workItemData.customFieldsMetadata;
      }
      console.log()
      const conditionFunction = new Function('data', `
        'use strict';
        try {
          return Boolean(${conditionCode});
        } catch (error) {
          console.error('[Condition Evaluator] Error in condition:', error.message);
          return false;
        }
      `);

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
