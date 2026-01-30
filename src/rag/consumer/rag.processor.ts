import { RagQueueMessage } from '../../queue/queue.types.js';
import { RagClient } from '../core/rag.client.js';
import { RagDocumentBuilder } from '../core/rag.document.builder.js';
import { getPrismaClient } from '../../db/prisma.js';

/**
 * Purpose: Process RAG indexing jobs from queue (business logic layer)
 * Re-fetches latest DB state and performs RAG operations
 */
export class RagProcessor {
  private client: RagClient;
  private builder: RagDocumentBuilder;

  constructor() {
    this.client = new RagClient();
    this.builder = new RagDocumentBuilder();
  }

  /**
   * Purpose: Process RAG queue message and route to appropriate handler
   */
  public async processMessage(message: RagQueueMessage): Promise<void> {
    console.log(`[RAG Processor] Processing ${message.entity_type} ${message.action} ${message.entity_id}`);

    try {
      if (message.entity_type === 'work_item') {
        await this.processWorkItem(message);
      } else if (message.entity_type === 'custom_field_value') {
        await this.processCustomFieldValue(message);
      } else if (message.entity_type === 'category') {
        await this.processCategoryUpdate(message);
      } else if (message.entity_type === 'custom_field_meta_data') {
        await this.processCustomFieldMetaUpdate(message);
      } else {
        console.warn(`[RAG Processor] Unknown entity type: ${message.entity_type}`);
      }
    } catch (error) {
      console.error(`[RAG Processor] Failed to process message:`, error);
      throw error;
    }
  }

  /**
   * Purpose: Process work item create/update/delete
   */
  private async processWorkItem(message: RagQueueMessage): Promise<void> {
    if (message.action === 'create') {
      await this.processWorkItemCreate(message.entity_id, message.org_id);
    } else if (message.action === 'update') {
      await this.processWorkItemUpdate(message.entity_id, message.org_id);
    } else if (message.action === 'delete') {
      await this.processWorkItemDelete(message.entity_id);
    }
  }

  /**
   * Purpose: Index new work item in RAG
   */
  private async processWorkItemCreate(workItemId: number, orgId: number): Promise<void> {
    const collectionId = await this.client.createCollection(orgId.toString());

    const document = await this.builder.buildDocument(BigInt(workItemId));
    if (!document) {
      console.warn(`[RAG Processor] Cannot build document for work item ${workItemId}`);
      return;
    }

    const resourceId = `workItem:${workItemId}`;
    const ownerId = `org:${orgId}`;
    
    await this.client.addResource(collectionId, resourceId, document.title, document.content, ownerId);
    console.log(`[RAG Processor] Indexed work item ${workItemId}`);
  }

  /**
   * Purpose: Update existing work item in RAG
   */
  private async processWorkItemUpdate(workItemId: number, orgId: number): Promise<void> {
    const document = await this.builder.buildDocument(BigInt(workItemId));
    if (!document) {
      console.warn(`[RAG Processor] Cannot build document for work item ${workItemId}`);
      return;
    }

    const resourceId = `workItem:${workItemId}`;
    
    try {
      await this.client.updateResource(resourceId, document.title, document.content);
      console.log(`[RAG Processor] Updated work item ${workItemId}`);
    } catch (error) {
      console.log(`[RAG Processor] Resource not found, adding instead`);
      const collectionId = await this.client.createCollection(orgId.toString());
      const ownerId = `org:${orgId}`;
      await this.client.addResource(collectionId, resourceId, document.title, document.content, ownerId);
      console.log(`[RAG Processor] Indexed work item ${workItemId}`);
    }
  }

  /**
   * Purpose: Remove work item from RAG
   */
  private async processWorkItemDelete(workItemId: number): Promise<void> {
    const resourceId = `workItem:${workItemId}`;
    await this.client.deleteResource(resourceId);
    console.log(`[RAG Processor] Deleted work item ${workItemId}`);
  }

  /**
   * Purpose: Process custom field value update (updates parent work item)
   */
  private async processCustomFieldValue(message: RagQueueMessage): Promise<void> {
    await this.processWorkItemUpdate(message.entity_id, message.org_id);
  }

  /**
   * Purpose: Process category update (cascading update to all work items)
   */
  private async processCategoryUpdate(message: RagQueueMessage): Promise<void> {
    const prisma = getPrismaClient();

    // Get all work items in this category
    const workItems = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id FROM work_items WHERE category_id = ${message.entity_id}
    `);

    console.log(`[RAG Processor] Updating ${workItems.length} work items in category ${message.entity_id}`);

    // Update each work item in RAG
    for (const item of workItems) {
      await this.processWorkItemUpdate(Number(item.id), message.org_id);
    }

    console.log(`[RAG Processor] Completed category update for ${workItems.length} work items`);
  }

  /**
   * Purpose: Process custom field metadata update (cascading update to all affected work items)
   */
  private async processCustomFieldMetaUpdate(message: RagQueueMessage): Promise<void> {
    const prisma = getPrismaClient();

    // Get all work items using this custom field
    const workItems = await prisma.$queryRawUnsafe<any[]>(`
      SELECT DISTINCT work_item_id as id
      FROM custom_field_values
      WHERE custom_field_meta_data_id = ${message.entity_id}
    `);

    console.log(`[RAG Processor] Updating ${workItems.length} work items with custom field ${message.entity_id}`);

    // Update each work item in RAG
    for (const item of workItems) {
      await this.processWorkItemUpdate(Number(item.id), message.org_id);
    }

    console.log(`[RAG Processor] Completed custom field meta update for ${workItems.length} work items`);
  }
}
