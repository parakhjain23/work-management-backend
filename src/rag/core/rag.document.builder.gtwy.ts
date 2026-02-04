/**
 * Purpose: Build document structure for GTWY RAG API
 * Extends base document builder to include description field required by GTWY
 */

import { WorkItemsService } from '../../services/workItems.service.js';

export interface GtwyWorkItemDocument {
  workItemId: number;
  title: string;
  description: string;
  content: string;
}

export class GtwyRagDocumentBuilder {
  private workItemsService: WorkItemsService;

  constructor() {
    this.workItemsService = new WorkItemsService();
  }

  /**
   * Purpose: Build document with title, description, and content for GTWY API
   */
  public async buildDocument(workItemId: number, orgId: number): Promise<GtwyWorkItemDocument | null> {
    try {
      // Use getFullData to fetch complete work item data
      const workItemData = await this.workItemsService.getFullData(workItemId, orgId);

      if (!workItemData) {
        return null;
      }

      // Format document content
      const content = this.formatDocument(workItemData);
      
      return {
        workItemId,
        title: workItemData.title || 'Untitled',
        description: workItemData.description || '',
        content
      };
    } catch (error) {
      console.error(`[GTWY RAG] Failed to build document for work item ${workItemId}:`, error);
      return null;
    }
  }

  private formatDocument(workItemData: any): string {
    const parts: string[] = [];

    parts.push(`Work Item: ${workItemData.title || 'Untitled'}`);
    parts.push('');

    if (workItemData.description) {
      parts.push('Description:');
      parts.push(workItemData.description);
      parts.push('');
    }

    if (workItemData.category?.name) {
      parts.push('Category:');
      parts.push(workItemData.category.name);
      parts.push('');
    }

    // Add custom fields if present
    if (workItemData.customFields && Object.keys(workItemData.customFields).length > 0) {
      parts.push('Custom Fields:');
      
      // Get metadata for descriptions
      const metadataMap = new Map();
      if (workItemData.customFieldsMetadata) {
        for (const meta of workItemData.customFieldsMetadata) {
          metadataMap.set(meta.keyName, meta);
        }
      }

      for (const [keyName, value] of Object.entries(workItemData.customFields)) {
        if (value !== null && value !== undefined) {
          const metadata = metadataMap.get(keyName);
          const displayValue = this.formatFieldValue(value);
          
          if (metadata?.description) {
            parts.push(`- ${keyName} (${metadata.description}): ${displayValue}`);
          } else {
            parts.push(`- ${keyName}: ${displayValue}`);
          }
        }
      }
      parts.push('');
    }

    return parts.join('\n').trim();
  }

  private formatFieldValue(value: any): string {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  }
}
