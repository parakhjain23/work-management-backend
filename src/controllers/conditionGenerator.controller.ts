import { Request, Response } from 'express';

/**
 * Purpose: Return example data structure for AI condition generation
 * No authentication required - this is reference data for AI
 */
export const getConditionGeneratorData = async (_req: Request, res: Response): Promise<void> => {
  const exampleData = {
    entity: "custom_field_value",
    action: "update",
    work_item_id: "8",
    org_id: "1",
    category_id: "4",
    triggered_by: "user",
    changedFields: ["rating"],
    fieldChanges: {
      rating: {
        oldValue: 3,
        newValue: 5,
        fieldType: "custom_field"
      }
    },
    id: "8",
    title: "Login flow",
    description: "Login flow is very slow.",
    status: "CAPTURED",
    priority: "",
    categoryId: "4",
    assigneeId: null,
    createdBy: "1",
    updatedBy: "1",
    startDate: null,
    dueDate: null,
    parentId: null,
    rootParentId: null,
    externalId: null,
    docId: null,
    createdAt: "2026-02-02T09:07:30.535Z",
    updatedAt: "2026-02-02T09:09:35.896Z",
    category: {
      id: "4",
      name: "Feedback",
      keyName: "feedback",
      externalTool: "linear"
    },
    customFieldsMetadata: [
      {
        id: "5",
        keyName: "dummy",
        name: "dummy",
        dataType: "text",
        description: "to check the dummy custom field api working or not",
        enums: "",
        meta: null
      },
      {
        id: "1",
        keyName: "rating",
        name: "Rating",
        dataType: "number",
        description: "rating",
        enums: "1,2,3,4,5",
        meta: {
          field_type: "single-select"
        }
      },
      {
        id: "2",
        keyName: "status",
        name: "status",
        dataType: "text",
        description: "status of feedback",
        enums: "approved,pending,rejected",
        meta: {
          field_type: "single-select"
        }
      }
    ],
    customFields: {
      rating: 5,
      status: "approved"
    }
  };

  res.json({
    success: true,
    data: exampleData,
    description: "Example data structure available in system prompt condition evaluation",
    usage: "Use this structure to generate JavaScript condition code that returns boolean. All fields are at root level in the data object."
  });
};
