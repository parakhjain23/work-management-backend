import { MutationEvent } from '../../events/event.logger.js';
import { RagQueueMessage } from '../../queue/queue.types.js';
import { publishToRagQueue } from '../../queue/rag.queue.publisher.js';
import {
  shouldUpdateRagForWorkItem,
  shouldUpdateRagForCategory,
  shouldUpdateRagForCustomFieldMeta,
  extractWorkItemIdFromCustomFieldSql,
} from '../core/rag.rules.js';

/**
 * Purpose: Handle mutation events and enqueue RAG indexing jobs
 * Maps events to queue messages, applies business rules, no RAG API calls
 */
export async function handleRagEvent(event: MutationEvent): Promise<void> {
  try {
    // Handle work_item events
    if (event.entity_type === 'work_item' && event.entity_id) {
      await handleWorkItemEvent(event);
      return;
    }

    // Handle custom_field_value events (update parent work item)
    if (event.entity_type === 'custom_field_value') {
      await handleCustomFieldValueEvent(event);
      return;
    }

    // Handle category changes (update all work items in that category)
    if (event.entity_type === 'category' && event.entity_id) {
      await handleCategoryEvent(event);
      return;
    }

    // Handle custom_field_meta_data changes (update all work items using that field)
    if (event.entity_type === 'custom_field_meta_data' && event.entity_id) {
      await handleCustomFieldMetaEvent(event);
      return;
    }

  } catch (error) {
    console.error('[RAG Event Handler] Failed to handle event:', error);
  }
}

/**
 * Purpose: Handle work item create/update/delete events
 * Enqueues message for direct work item indexing
 */
async function handleWorkItemEvent(event: MutationEvent): Promise<void> {
  if (!event.entity_id) return;

  // For updates, check if RAG should be updated
  if (event.action === 'UPDATE' && !shouldUpdateRagForWorkItem(event.sql)) {
    console.log(`[RAG Event Handler] Skipping work item update ${event.entity_id} - no searchable content changed`);
    return;
  }

  // Extract org_id from event or fetch it
  const orgId = await extractOrgIdForWorkItem(Number(event.entity_id));
  if (!orgId) {
    console.warn(`[RAG Event Handler] Cannot enqueue work item ${event.entity_id} - no org_id found`);
    return;
  }

  const message: RagQueueMessage = {
    entity_type: 'work_item',
    action: event.action.toLowerCase() as 'create' | 'update' | 'delete',
    entity_id: Number(event.entity_id),
    org_id: orgId,
    timestamp: new Date().toISOString(),
  };

  await publishToRagQueue(message);
}

/**
 * Purpose: Handle custom field value changes
 * Extracts parent work item ID and enqueues update
 */
async function handleCustomFieldValueEvent(event: MutationEvent): Promise<void> {
  const workItemId = extractWorkItemIdFromCustomFieldSql(event.sql);
  if (!workItemId) {
    console.warn('[RAG Event Handler] Cannot extract work_item_id from custom field event');
    return;
  }

  // Check if update affects searchable content
  if (!shouldUpdateRagForWorkItem(event.sql)) {
    console.log(`[RAG Event Handler] Skipping custom field update for work item ${workItemId} - no searchable content changed`);
    return;
  }

  const orgId = await extractOrgIdForWorkItem(workItemId);
  if (!orgId) {
    console.warn(`[RAG Event Handler] Cannot enqueue work item ${workItemId} - no org_id found`);
    return;
  }

  const message: RagQueueMessage = {
    entity_type: 'custom_field_value',
    action: 'update',
    entity_id: Number(workItemId),
    org_id: orgId,
    timestamp: new Date().toISOString(),
  };

  await publishToRagQueue(message);
}

/**
 * Purpose: Handle category name changes
 * Enqueues message to trigger cascading work item updates
 */
async function handleCategoryEvent(event: MutationEvent): Promise<void> {
  if (!event.entity_id) return;

  // Only update RAG if category name changed
  if (event.action === 'UPDATE' && !shouldUpdateRagForCategory(event.sql)) {
    console.log(`[RAG Event Handler] Skipping category update ${event.entity_id} - name not changed`);
    return;
  }

  const orgId = await extractOrgIdForCategory(Number(event.entity_id));
  if (!orgId) {
    console.warn(`[RAG Event Handler] Cannot enqueue category ${event.entity_id} - no org_id found`);
    return;
  }

  const message: RagQueueMessage = {
    entity_type: 'category',
    action: event.action.toLowerCase() as 'create' | 'update' | 'delete',
    entity_id: Number(event.entity_id),
    org_id: orgId,
    timestamp: new Date().toISOString(),
  };

  await publishToRagQueue(message);
}

/**
 * Purpose: Handle custom field metadata changes
 * Enqueues message to trigger cascading work item updates
 */
async function handleCustomFieldMetaEvent(event: MutationEvent): Promise<void> {
  if (!event.entity_id) return;

  // Only update RAG if field name or description changed
  if (event.action === 'UPDATE' && !shouldUpdateRagForCustomFieldMeta(event.sql)) {
    console.log(`[RAG Event Handler] Skipping custom field meta update ${event.entity_id} - name/description not changed`);
    return;
  }

  const orgId = await extractOrgIdForCustomFieldMeta(Number(event.entity_id));
  if (!orgId) {
    console.warn(`[RAG Event Handler] Cannot enqueue custom field meta ${event.entity_id} - no org_id found`);
    return;
  }

  const message: RagQueueMessage = {
    entity_type: 'custom_field_meta_data',
    action: event.action.toLowerCase() as 'create' | 'update' | 'delete',
    entity_id: Number(event.entity_id),
    org_id: orgId,
    timestamp: new Date().toISOString(),
  };

  await publishToRagQueue(message);
}

/**
 * Purpose: Extract organization ID for work item
 * Queries database to get org_id from work item's category
 */
async function extractOrgIdForWorkItem(workItemId: number): Promise<number | null> {
  try {
    const { getPrismaClient } = await import('../../db/prisma.js');
    const prisma = getPrismaClient();

    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT c.org_id
      FROM work_items wi
      JOIN categories c ON c.id = wi.category_id
      WHERE wi.id = ${workItemId}
      LIMIT 1
    `);

    if (result && result.length > 0) {
      return Number(result[0].org_id);
    }

    return null;
  } catch (error) {
    console.error(`[RAG Event Handler] Failed to extract org_id for work item ${workItemId}:`, error);
    return null;
  }
}

/**
 * Purpose: Extract organization ID for category
 */
async function extractOrgIdForCategory(categoryId: number): Promise<number | null> {
  try {
    const { getPrismaClient } = await import('../../db/prisma.js');
    const prisma = getPrismaClient();

    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT org_id
      FROM categories
      WHERE id = ${categoryId}
      LIMIT 1
    `);

    if (result && result.length > 0) {
      return Number(result[0].org_id);
    }

    return null;
  } catch (error) {
    console.error(`[RAG Event Handler] Failed to extract org_id for category ${categoryId}:`, error);
    return null;
  }
}

/**
 * Purpose: Extract organization ID for custom field metadata
 */
async function extractOrgIdForCustomFieldMeta(customFieldMetaId: number): Promise<number | null> {
  try {
    const { getPrismaClient } = await import('../../db/prisma.js');
    const prisma = getPrismaClient();

    const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT org_id
      FROM custom_field_meta_data
      WHERE id = ${customFieldMetaId}
      LIMIT 1
    `);

    if (result && result.length > 0) {
      return Number(result[0].org_id);
    }

    return null;
  } catch (error) {
    console.error(`[RAG Event Handler] Failed to extract org_id for custom field meta ${customFieldMetaId}:`, error);
    return null;
  }
}
