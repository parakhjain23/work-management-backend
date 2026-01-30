export interface ThreadScope {
  type: 'global' | 'work_item';
  orgId?: string;
  workItemId?: string;
}

export interface ScopeValidationResult {
  valid: boolean;
  scope?: ThreadScope;
  error?: string;
}

export class ScopeValidator {
  public parseThreadId(threadId: string | undefined): ScopeValidationResult {
    if (!threadId) {
      return {
        valid: true,
        scope: { type: 'global' }
      };
    }

    const globalPattern = /^org:([^:]+):global$/;
    const workItemPattern = /^workItem:(\d+)$/;

    const globalMatch = threadId.match(globalPattern);
    if (globalMatch) {
      return {
        valid: true,
        scope: {
          type: 'global',
          orgId: globalMatch[1]
        }
      };
    }

    const workItemMatch = threadId.match(workItemPattern);
    if (workItemMatch) {
      return {
        valid: true,
        scope: {
          type: 'work_item',
          workItemId: workItemMatch[1]
        }
      };
    }

    return {
      valid: false,
      error: 'Invalid threadId format. Expected org:{orgId}:global or workItem:{id}'
    };
  }

  public validateSqlForScope(sql: string, scope: ThreadScope): ScopeValidationResult {
    if (scope.type === 'global') {
      return { valid: true, scope };
    }

    if (scope.type === 'work_item' && scope.workItemId) {
      return this.validateWorkItemScopedSql(sql, scope.workItemId);
    }

    return { valid: true, scope };
  }

  private validateWorkItemScopedSql(sql: string, workItemId: string): ScopeValidationResult {
    const upperSql = sql.toUpperCase();
    const lowerSql = sql.toLowerCase();

    if (upperSql.startsWith('UPDATE') || upperSql.startsWith('DELETE')) {
      if (lowerSql.includes('work_items')) {
        const wherePattern = /WHERE\s+.*?id\s*=\s*(\d+)/i;
        const match = sql.match(wherePattern);
        
        if (match) {
          const targetId = match[1];
          if (targetId !== workItemId) {
            return {
              valid: false,
              error: `Work item scope violation: Cannot modify work_item ${targetId} from workItem:${workItemId} thread`
            };
          }
        } else {
          const anyIdPattern = /id\s*=\s*(\d+)/i;
          const anyMatch = sql.match(anyIdPattern);
          if (anyMatch && anyMatch[1] !== workItemId) {
            return {
              valid: false,
              error: `Work item scope violation: Can only modify work_item ${workItemId} in this thread`
            };
          }
        }
      }
    }

    if (upperSql.startsWith('INSERT') && lowerSql.includes('work_items')) {
      const parentIdPattern = /parent_id[^,)]*?(\d+)/i;
      const match = sql.match(parentIdPattern);
      
      if (match) {
        const parentId = match[1];
        if (parentId !== workItemId) {
          return {
            valid: false,
            error: `Work item scope violation: Child work items must have parent_id = ${workItemId}`
          };
        }
      }
    }

    return {
      valid: true,
      scope: { type: 'work_item', workItemId }
    };
  }
}
