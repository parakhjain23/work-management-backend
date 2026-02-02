export interface WorkItemFullData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  categoryId: string | null;
  assigneeId: string | null;
  createdBy: string;
  updatedBy: string;
  startDate: string | null;
  dueDate: string | null;
  parentId: string | null;
  rootParentId: string | null;
  externalId: string | null;
  docId: string | null;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    keyName: string;
    externalTool: string | null;
  } | null;
  customFieldsMetadata: Array<{
    id: string;
    keyName: string;
    name: string;
    dataType: string;
    description: string | null;
    enums: string | null;
    meta: any;
  }>;
  customFields: Record<string, any>;
}
