export type RagQueueMessage = {
  entity_type: "work_item" | "category" | "custom_field_value" | "custom_field_meta_data";
  action: "create" | "update" | "delete";
  entity_id: number;
  org_id: number;
  changed_fields?: string[];
  timestamp: string;
};

export const RAG_QUEUE_NAME = 'rag.index.queue';
