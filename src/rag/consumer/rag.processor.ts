import { RagQueueMessage } from '../../queue/queue.types.js';
import { GtwyRagClient } from '../core/rag.client.gtwy.js';
import { GtwyRagDocumentBuilder } from '../core/rag.document.builder.gtwy.js';
import { getPrismaClient } from '../../db/prisma.js';

/**
 * Purpose: Process RAG indexing jobs from queue (business logic layer)
 * Re-fetches latest DB state and performs RAG operations
 */
export class RagProcessor {
  private client: GtwyRagClient;
  private builder: GtwyRagDocumentBuilder;

  constructor() {
    this.client = new GtwyRagClient();
    this.builder = new GtwyRagDocumentBuilder();
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
   * Checks if docId already exists (idempotency), creates resource, and saves docId
   */
  private async processWorkItemCreate(workItemId: number, orgId: number): Promise<void> {
    const prisma = getPrismaClient();

    try {
      // Check if docId already exists (idempotency safety)
      const existingWorkItem = await prisma.$queryRawUnsafe<any[]>(`
        SELECT doc_id FROM work_items WHERE id = ${workItemId} LIMIT 1
      `);

      if (existingWorkItem && existingWorkItem.length > 0 && existingWorkItem[0].doc_id) {
        console.log(`[RAG Processor] Work item ${workItemId} already has docId: ${existingWorkItem[0].doc_id}, skipping creation`);
        return;
      }

      // Build document
      const document = await this.builder.buildDocument(Number(workItemId), orgId);
      if (!document) {
        console.warn(`[RAG Processor] Cannot build document for work item ${workItemId}`);
        return;
      }

      // Create resource in GTWY
      const docId = await this.client.createResource({
        title: document.title,
        description: document.description,
        content: document.content,
        ownerId: orgId.toString()
      });

      // Save docId to database
      await prisma.$executeRawUnsafe(`
        UPDATE work_items SET doc_id = '${docId}' WHERE id = ${workItemId}
      `);

      console.log(`[RAG Processor] Indexed work item ${workItemId} with docId: ${docId}`);
    } catch (error) {
      console.error(`[RAG Processor] Failed to create work item ${workItemId}:`, error);
      // Don't throw - allow worker to continue processing other events
    }
  }

  /**
   * Purpose: Update existing work item in RAG
   * If docId exists, updates resource; otherwise creates new resource
   */
  private async processWorkItemUpdate(workItemId: number, orgId: number): Promise<void> {
    const prisma = getPrismaClient();

    try {
      // Get existing docId
      const workItem = await prisma.$queryRawUnsafe<any[]>(`
        SELECT doc_id FROM work_items WHERE id = ${workItemId} LIMIT 1
      `);

      if (!workItem || workItem.length === 0) {
        console.warn(`[RAG Processor] Work item ${workItemId} not found`);
        return;
      }

      const existingDocId = workItem[0].doc_id;

      // Build document
      const document = await this.builder.buildDocument(Number(workItemId), orgId);
      if (!document) {
        console.warn(`[RAG Processor] Cannot build document for work item ${workItemId}`);
        return;
      }

      // Check if docId is from legacy Hippocampus system
      if (existingDocId && this.client.isLegacyDocId(existingDocId)) {
        console.log(`[RAG Processor] Legacy docId detected: ${existingDocId}, recreating in GTWY`);
        // Create new resource in GTWY
        const newDocId = await this.client.createResource({
          title: document.title,
          description: document.description,
          content: document.content,
          ownerId: orgId.toString()
        });

        // Update docId in database
        await prisma.$executeRawUnsafe(`
          UPDATE work_items SET doc_id = '${newDocId}' WHERE id = ${workItemId}
        `);

        console.log(`[RAG Processor] Migrated work item ${workItemId} from legacy to GTWY docId: ${newDocId}`);
        return;
      }

      // If docId exists, update resource
      if (existingDocId) {
        await this.client.updateResource(existingDocId, {
          title: document.title,
          description: document.description,
          content: document.content
        });
        console.log(`[RAG Processor] Updated work item ${workItemId} with docId: ${existingDocId}`);
      } else {
        // No docId exists, create new resource
        const docId = await this.client.createResource({
          title: document.title,
          description: document.description,
          content: document.content,
          ownerId: orgId.toString()
        });

        // Save docId to database
        await prisma.$executeRawUnsafe(`
          UPDATE work_items SET doc_id = '${docId}' WHERE id = ${workItemId}
        `);

        console.log(`[RAG Processor] Created resource for work item ${workItemId} with docId: ${docId}`);
      }
    } catch (error) {
      console.error(`[RAG Processor] Failed to update work item ${workItemId}:`, error);
      // Don't throw - allow worker to continue processing other events
    }
  }

  /**
   * Purpose: Remove work item from RAG
   * Deletes resource from GTWY and clears docId from database
   */
  private async processWorkItemDelete(workItemId: number): Promise<void> {
    const prisma = getPrismaClient();

    try {
      // Get docId before deletion
      const workItem = await prisma.$queryRawUnsafe<any[]>(`
        SELECT doc_id FROM work_items WHERE id = ${workItemId} LIMIT 1
      `);

      if (workItem && workItem.length > 0 && workItem[0].doc_id) {
        const docId = workItem[0].doc_id;

        // Skip deletion if legacy docId
        if (!this.client.isLegacyDocId(docId)) {
          // Delete from GTWY
          await this.client.deleteResource(docId);
          console.log(`[RAG Processor] Deleted resource with docId: ${docId}`);
        }

        // Clear docId from database
        await prisma.$executeRawUnsafe(`
          UPDATE work_items SET doc_id = NULL WHERE id = ${workItemId}
        `);
      }

      console.log(`[RAG Processor] Deleted work item ${workItemId}`);
    } catch (error) {
      console.error(`[RAG Processor] Failed to delete work item ${workItemId}:`, error);
      // Don't throw - deletion failures should not crash worker
    }
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
