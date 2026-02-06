import { Request, Response } from 'express';

/**
 * Purpose: Return example data structure for AI condition generation
 * No authentication required - this is reference data for AI
 */
export const getConditionGeneratorData = async (_req: Request, res: Response): Promise<void> => {
  // Data structure as seen by condition evaluator - flat structure with all fields at root level
  const data = {
    // Event fields (from context.event)
    actionType: "<actionType>",
    entity: "<entity>",
    action: "<action>",
    changedFields: ["<field_name>"],
    fieldChanges: {
      "<field_name>": {
        oldValue: "<old_value>",
        newValue: "<new_value>",
        fieldType: "<field_type>"
      }
    },
    triggered_by: "<triggered_by>",
    work_item_id: "<work_item_id>",
    org_id: "<org_id>",
    category_id: "<category_id>",
    
    // Work item fields (from context.workItemData - flattened at root level)
    id: "<id>",
    title: "<title>",
    description: "<description>",
    status: "<status>",
    priority: "<priority>",
    categoryId: "<categoryId>",
    assigneeId: "<assigneeId>",
    createdBy: "<createdBy>",
    updatedBy: "<updatedBy>",
    startDate: "<startDate>",
    dueDate: "<dueDate>",
    parentId: "<parentId>",
    rootParentId: "<rootParentId>",
    externalId: "<externalId>",
    docId: "<docId>",
    createdAt: "<createdAt>",
    updatedAt: "<updatedAt>",
    
    // Category (optional - can be null)
    category: {
      id: "<category.id>",
      name: "<category.name>",
      keyName: "<category.keyName>",
      externalTool: "<category.externalTool>"
    },
    
    // Custom fields metadata
    customFieldsMetadata: [
      {
        id: "<customFieldsMetadata[].id>",
        keyName: "<customFieldsMetadata[].keyName>",
        name: "<customFieldsMetadata[].name>",
        dataType: "<customFieldsMetadata[].dataType>",
        description: "<customFieldsMetadata[].description>",
        enums: "<customFieldsMetadata[].enums>",
        meta: "<customFieldsMetadata[].meta>"
      }
    ],
    
    // Custom fields (key-value pairs)
    customFields: {
      "<custom_field_key>": "<custom_field_value>"
    }
  };

  res.json(data);
};
