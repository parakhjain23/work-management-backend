export type RagQueueMessage = {
  entity_type: "work_item" | "category" | "custom_field_value" | "custom_field_meta_data";
  action: "create" | "update" | "delete";
  entity_id: number;
  org_id: number;
  changed_fields?: string[];
  timestamp: string;
  doc_id?: string | null;
};

// Exchange and Queue Names
export const EVENTS_EXCHANGE = process.env.EVENTS_EXCHANGE || 'domain.events';
export const RAG_QUEUE = process.env.RAG_QUEUE || 'rag.index.queue';
export const SYSTEMPROMPT_QUEUE = process.env.SYSTEMPROMPT_QUEUE || 'systemprompt.execute.queue';
