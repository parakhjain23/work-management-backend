import { SqlService } from '../ai/sql.service.js';
import { EventDispatcher, EventMatch } from './event.dispatcher.js';
import { ExecutionGuard, ExecutionContext } from './execution.guard.js';
import { getPrismaClient } from '../db/prisma.js';

export interface PromptExecutionResult {
  success: boolean;
  actionsExecuted: number;
  error?: string;
}

export class PromptExecutor {
  private dispatcher: EventDispatcher;
  private executionGuard: ExecutionGuard;
  private sqlService: SqlService;

  constructor() {
    this.dispatcher = new EventDispatcher();
    this.executionGuard = new ExecutionGuard();
    this.sqlService = new SqlService();
  }

  public async executeForEvent(event: {
    entity_type: string;
    action: string;
    entity_id?: number | bigint;
    sql?: string;
  }): Promise<void> {
    const matches = await this.dispatcher.findMatchingRules(event);
    
    if (matches.length === 0) {
      return;
    }

    for (const match of matches) {
      await this.executePrompt(match, event);
    }
  }

  private async executePrompt(match: EventMatch, event: any): Promise<void> {
    const context: ExecutionContext = {
      eventId: match.eventId,
      ruleId: match.ruleId,
      promptId: match.promptId,
      entityType: match.entityType,
      entityId: match.entityId
    };

    const guardResult = this.executionGuard.canExecute(context);
    if (!guardResult.allowed) {
      console.log(`[SYSTEM PROMPT] Execution blocked: ${guardResult.reason}`);
      await this.logExecution(context, false, null, guardResult.reason);
      return;
    }

    this.executionGuard.markExecutionStart(context);

    try {
      const promptText = await this.dispatcher.getSystemPrompt(match.promptId);
      if (!promptText) {
        throw new Error('System prompt not found or inactive');
      }

      const aiResponse = await this.callAI(promptText, event);
      
      if (!aiResponse || !aiResponse.actions || !Array.isArray(aiResponse.actions)) {
        throw new Error('Invalid AI response format');
      }

      let executedCount = 0;
      for (const action of aiResponse.actions) {
        if (action.type === 'UPDATE' && action.sql) {
          const result = await this.sqlService.executeSql(action.sql);
          if (result.success) {
            executedCount++;
          } else {
            console.error(`[SYSTEM PROMPT] Action failed: ${result.error}`);
          }
        }
      }

      await this.logExecution(context, true, JSON.stringify(aiResponse), null);
      console.log(`[SYSTEM PROMPT] Executed ${executedCount} actions for rule ${match.ruleId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SYSTEM PROMPT] Execution failed:`, errorMessage);
      await this.logExecution(context, false, null, errorMessage);
    } finally {
      this.executionGuard.markExecutionEnd(context);
    }
  }

  private async callAI(promptText: string, event: any): Promise<any> {
    console.log(`[SYSTEM PROMPT] AI call simulated for event:`, event);
    
    return {
      actions: []
    };
  }

  private async logExecution(
    context: ExecutionContext,
    success: boolean,
    result: string | null,
    error: string | null
  ): Promise<void> {
    const prisma = getPrismaClient();
    
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO system_prompt_executions 
        (event_id, rule_id, prompt_id, execution_result, success, error_message, executed_at)
        VALUES (
          ${context.eventId || 'NULL'},
          ${context.ruleId},
          ${context.promptId},
          ${result ? `'${result.replace(/'/g, "''")}'` : 'NULL'},
          ${success},
          ${error ? `'${error.replace(/'/g, "''")}'` : 'NULL'},
          NOW()
        )
      `);
    } catch (err) {
      console.error('Failed to log system prompt execution:', err);
    }
  }
}
