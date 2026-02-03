export interface WorkItemFullData {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  categoryId: number | null;
  assigneeId: number | null;
  createdBy: number;
  updatedBy: number;
  startDate: string | null;
  dueDate: string | null;
  parentId: number | null;
  rootParentId: number | null;
  externalId: string | null;
  docId: string | null;
  createdAt: string;
  updatedAt: string;
  category: {
    id: number;
    name: string;
    keyName: string;
    externalTool: string | null;
  } | null;
  customFieldsMetadata: Array<{
    id: number;
    keyName: string;
    name: string;
    dataType: string;
    description: string | null;
    enums: string | null;
    meta: any;
  }>;
  customFields: Record<string, any>;
}
