import { getPrismaClient } from '../db/prisma.js';

export interface MutationEvent {
  entity_type: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_id?: number | bigint;
  sql?: string;
  metadata?: any;
}

export class EventLogger {
  private extractEntityType(sql: string): string {
    const lowerSql = sql.toLowerCase();
    
    if (lowerSql.includes('work_items')) return 'work_item';
    if (lowerSql.includes('categories')) return 'category';
    if (lowerSql.includes('custom_field_meta_data')) return 'custom_field_meta_data';
    if (lowerSql.includes('custom_field_values')) return 'custom_field_value';
    if (lowerSql.includes('work_item_logs')) return 'work_item_log';
    
    return 'unknown';
  }

  private extractAction(sql: string): 'CREATE' | 'UPDATE' | 'DELETE' {
    const upperSql = sql.toUpperCase().trim();
    
    if (upperSql.startsWith('INSERT')) return 'CREATE';
    if (upperSql.startsWith('UPDATE')) return 'UPDATE';
    if (upperSql.startsWith('DELETE')) return 'DELETE';
    
    return 'UPDATE';
  }

  private extractEntityId(sql: string, result: any): number | bigint | undefined {
    if (result && typeof result === 'object') {
      if ('id' in result) return result.id;
      if (Array.isArray(result) && result.length > 0 && 'id' in result[0]) {
        return result[0].id;
      }
    }
    
    const idMatch = sql.match(/id\s*=\s*(\d+)/i);
    if (idMatch) {
      return parseInt(idMatch[1], 10);
    }
    
    return undefined;
  }

  public async logMutation(sql: string, result?: any): Promise<void> {
    try {
      const event: MutationEvent = {
        entity_type: this.extractEntityType(sql),
        action: this.extractAction(sql),
        entity_id: this.extractEntityId(sql, result),
        sql: sql,
        metadata: result
      };

      console.log('[EVENT]', JSON.stringify(event, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));

      setImmediate(() => {
        this.triggerSystemPrompts(event).catch(err => {
          console.error('[EVENT] System prompt trigger failed:', err);
        });
      });

    } catch (error) {
      console.error('Failed to log mutation event:', error);
    }
  }

  private async triggerSystemPrompts(event: MutationEvent): Promise<void> {
    try {
      const { PromptExecutor } = await import('../system/prompt.executor.js');
      const executor = new PromptExecutor();
      await executor.executeForEvent(event);
    } catch (error) {
      console.error('[EVENT] Failed to execute system prompts:', error);
    }

    try {
      const { RagProducer } = await import('../rag/rag.producer.js');
      const ragProducer = new RagProducer();
      await ragProducer.handleEvent(event);
    } catch (error) {
      console.error('[EVENT] Failed to update RAG:', error);
    }
  }
}
