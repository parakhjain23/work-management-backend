import { getPrismaClient } from '../../db/prisma';

export interface WorkItemDocument {
  workItemId: bigint;
  title: string;
  content: string;
}

export class RagDocumentBuilder {
  public async buildDocument(workItemId: bigint): Promise<WorkItemDocument | null> {
    const prisma = getPrismaClient();

    try {
      const workItem = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          wi.id,
          wi.title,
          wi.description,
          wi.status,
          wi.priority,
          c.name as category_name
        FROM work_items wi
        LEFT JOIN categories c ON c.id = wi.category_id
        WHERE wi.id = ${workItemId}
        LIMIT 1
      `);

      if (!workItem || workItem.length === 0) {
        return null;
      }

      const item = workItem[0];

      const customFields = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          cfmd.key_name as field_key_name,
          cfmd.description as field_description,
          cfmd.data_type,
          cfv.value_text,
          cfv.value_boolean
        FROM custom_field_values cfv
        JOIN custom_field_meta_data cfmd ON cfmd.id = cfv.custom_field_meta_data_id
        WHERE cfv.work_item_id = ${workItemId}
          AND cfmd.data_type IN ('text', 'boolean')
        ORDER BY cfmd.key_name ASC
      `);

      const content = this.formatDocument(item, customFields);
      
      return {
        workItemId,
        title: item.title || 'Untitled',
        content
      };
    } catch (error) {
      console.error(`[RAG] Failed to build document for work item ${workItemId}:`, error);
      return null;
    }
  }

  private formatDocument(workItem: any, customFields: any[]): string {
    const parts: string[] = [];

    parts.push(`Work Item: ${workItem.title || 'Untitled'}`);
    parts.push('');

    if (workItem.description) {
      parts.push('Description:');
      parts.push(workItem.description);
      parts.push('');
    }

    if (workItem.category_name) {
      parts.push('Category:');
      parts.push(workItem.category_name);
      parts.push('');
    }

    if (customFields && customFields.length > 0) {
      parts.push('Custom Fields:');
      for (const field of customFields) {
        const value = this.extractFieldValue(field);
        if (value) {
          if (field.field_description) {
            parts.push(`- ${field.field_key_name} (${field.field_description}): ${value}`);
          } else {
            parts.push(`- ${field.field_key_name}: ${value}`);
          }
        }
      }
      parts.push('');
    }

    return parts.join('\n').trim();
  }

  private extractFieldValue(field: any): string | null {
    if (field.data_type === 'text' && field.value_text) {
      return field.value_text;
    }
    if (field.data_type === 'boolean' && field.value_boolean !== null) {
      return field.value_boolean ? 'Yes' : 'No';
    }
    return null;
  }
}
