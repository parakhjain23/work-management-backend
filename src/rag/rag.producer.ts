import { RagClient } from './rag.client.js';
import { RagDocumentBuilder } from './rag.document.builder.js';
import { MutationEvent } from '../events/event.logger.js';

export class RagProducer {
  private client: RagClient;
  private builder: RagDocumentBuilder;

  constructor() {
    this.client = new RagClient();
    this.builder = new RagDocumentBuilder();
  }

  public async handleEvent(event: MutationEvent): Promise<void> {
    try {
      // Handle work_item events
      if (event.entity_type === 'work_item' && event.entity_id) {
        if (event.action === 'CREATE') {
          await this.indexWorkItem(event.entity_id, event.sql);
        } else if (event.action === 'UPDATE') {
          await this.updateWorkItem(event.entity_id, event.sql);
        } else if (event.action === 'DELETE') {
          await this.deleteWorkItem(event.entity_id);
        }
      }
      
      // Handle custom_field_value events (update parent work item)
      if (event.entity_type === 'custom_field_value') {
        const workItemId = await this.extractWorkItemIdFromCustomField(event.sql);
        if (workItemId) {
          await this.updateWorkItem(workItemId, event.sql);
        }
      }
      
      // Handle category changes (update all work items in that category)
      if (event.entity_type === 'category' && event.entity_id) {
        if (event.action === 'UPDATE' && this.shouldUpdateRagForCategory(event.sql)) {
          await this.updateWorkItemsInCategory(event.entity_id);
        }
      }
      
      // Handle custom_field_meta_data changes (update all work items using that field)
      if (event.entity_type === 'custom_field_meta_data' && event.entity_id) {
        if (event.action === 'UPDATE' && this.shouldUpdateRagForCustomFieldMeta(event.sql)) {
          await this.updateWorkItemsWithCustomField(event.entity_id);
        }
      }
      
    } catch (error) {
      console.error(`[RAG Producer] Failed to handle event:`, error);
    }
  }

  private async indexWorkItem(workItemId: number | number, sql?: string): Promise<void> {
    const orgId = await this.extractOrgId(workItemId);
    if (!orgId) {
      console.warn(`[RAG Producer] Cannot index work item ${workItemId} - no org_id found`);
      return;
    }

    const collectionId = await this.client.createCollection(orgId);

    const document = await this.builder.buildDocument(Number(workItemId));
    if (!document) {
      console.warn(`[RAG Producer] Cannot build document for work item ${workItemId}`);
      return;
    }

    const resourceId = `workItem:${workItemId}`;
    const ownerId = `org:${orgId}`;
    
    await this.client.addResource(collectionId, resourceId, document.title, document.content, ownerId);
  }

  private async updateWorkItem(workItemId: number | number, sql?: string): Promise<void> {
    if (!this.shouldUpdateRag(sql)) {
      return;
    }

    const orgId = await this.extractOrgId(workItemId);
    if (!orgId) {
      return;
    }

    const document = await this.builder.buildDocument(Number(workItemId));
    if (!document) {
      return;
    }

    const resourceId = `workItem:${workItemId}`;
    
    try {
      await this.client.updateResource(resourceId, document.title, document.content);
    } catch (error) {
      console.log(`[RAG Producer] Resource not found, adding instead`);
      const collectionId = await this.client.createCollection(orgId);
      const ownerId = `org:${orgId}`;
      await this.client.addResource(collectionId, resourceId, document.title, document.content, ownerId);
    }
  }

  private async deleteWorkItem(workItemId: number | number): Promise<void> {
    const resourceId = `workItem:${workItemId}`;
    await this.client.deleteResource(resourceId);
  }

  private shouldUpdateRag(sql?: string): boolean {
    if (!sql) {
      return false;
    }

    const lowerSql = sql.toLowerCase();

    // Update RAG only if searchable content fields change
    if (lowerSql.includes('title') ||
        lowerSql.includes('description') ||
        lowerSql.includes('category_id') ||
        lowerSql.includes('value_text') ||
        lowerSql.includes('value_boolean')) {
      return true;
    }

    return false;
  }

  private shouldUpdateRagForCategory(sql?: string): boolean {
    if (!sql) return false;
    const lowerSql = sql.toLowerCase();
    // Update RAG if category name changed (affects document content)
    return lowerSql.includes('name');
  }

  private shouldUpdateRagForCustomFieldMeta(sql?: string): boolean {
    if (!sql) return false;
    const lowerSql = sql.toLowerCase();
    // Update RAG if field name or description changed (affects document content)
    return lowerSql.includes('name') || lowerSql.includes('description');
  }

  private async updateWorkItemsInCategory(categoryId: number | number): Promise<void> {
    try {
      const { getPrismaClient } = await import('../db/prisma.js');
      const prisma = getPrismaClient();

      // Get all work items in this category
      const workItems = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id FROM work_items WHERE category_id = ${categoryId}
      `);

      console.log(`[RAG Producer] Updating ${workItems.length} work items in category ${categoryId}`);

      // Update each work item in RAG
      for (const item of workItems) {
        await this.updateWorkItem(item.id, undefined);
      }
    } catch (error) {
      console.error(`[RAG Producer] Failed to update work items in category ${categoryId}:`, error);
    }
  }

  private async updateWorkItemsWithCustomField(customFieldMetaDataId: number | number): Promise<void> {
    try {
      const { getPrismaClient } = await import('../db/prisma.js');
      const prisma = getPrismaClient();

      // Get all work items using this custom field
      const workItems = await prisma.$queryRawUnsafe<any[]>(`
        SELECT DISTINCT work_item_id as id
        FROM custom_field_values
        WHERE custom_field_meta_data_id = ${customFieldMetaDataId}
      `);

      console.log(`[RAG Producer] Updating ${workItems.length} work items with custom field ${customFieldMetaDataId}`);

      // Update each work item in RAG
      for (const item of workItems) {
        await this.updateWorkItem(item.id, undefined);
      }
    } catch (error) {
      console.error(`[RAG Producer] Failed to update work items with custom field ${customFieldMetaDataId}:`, error);
    }
  }

  private async extractWorkItemIdFromCustomField(sql?: string): Promise<number | number | null> {
    if (!sql) {
      return null;
    }

    // Extract work_item_id from INSERT/UPDATE/DELETE on custom_field_values
    const workItemIdMatch = sql.match(/work_item_id\s*=\s*(\d+)/i);
    if (workItemIdMatch) {
      return parseInt(workItemIdMatch[1], 10);
    }

    // For INSERT statements: VALUES (..., work_item_id, ...)
    const insertMatch = sql.match(/VALUES\s*\((\d+),/i);
    if (insertMatch && sql.toLowerCase().includes('custom_field_values')) {
      return parseInt(insertMatch[1], 10);
    }

    return null;
  }

  private async extractOrgId(workItemId: number | number): Promise<string | null> {
    try {
      const { getPrismaClient } = await import('../db/prisma.js');
      const prisma = getPrismaClient();

      const result = await prisma.$queryRawUnsafe<any[]>(`
        SELECT c.org_id
        FROM work_items wi
        JOIN categories c ON c.id = wi.category_id
        WHERE wi.id = ${workItemId}
        LIMIT 1
      `);

      if (result && result.length > 0) {
        return result[0].org_id.toString();
      }

      return null;
    } catch (error) {
      console.error(`[RAG Producer] Failed to extract org_id for work item ${workItemId}:`, error);
      return null;
    }
  }
}
