/**
 * Purpose: Determine when RAG indexing should occur based on SQL changes
 * Contains all business rules for RAG trigger logic
 */

/**
 * Purpose: Check if work item update affects searchable content
 * Returns true if title, description, category_id, or custom field values changed
 */
export function shouldUpdateRagForWorkItem(sql?: string): boolean {
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

/**
 * Purpose: Check if category update affects RAG documents
 * Returns true if category name changed (affects document content)
 */
export function shouldUpdateRagForCategory(sql?: string): boolean {
  if (!sql) return false;
  const lowerSql = sql.toLowerCase();
  return lowerSql.includes('name');
}

/**
 * Purpose: Check if custom field metadata update affects RAG documents
 * Returns true if field name or description changed (affects document content)
 */
export function shouldUpdateRagForCustomFieldMeta(sql?: string): boolean {
  if (!sql) return false;
  const lowerSql = sql.toLowerCase();
  return lowerSql.includes('name') || lowerSql.includes('description');
}

/**
 * Purpose: Extract work item ID from custom field value SQL
 * Parses SQL to find work_item_id for custom field changes
 */
export function extractWorkItemIdFromCustomFieldSql(sql?: string): number | null {
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
