export interface InvariantValidationResult {
  valid: boolean;
  error?: string;
}

export class InvariantGuard {
  private readonly IMMUTABLE_FIELDS = ['id', 'created_at', 'created_by'];
  
  private readonly STATUS_TRANSITIONS: Record<string, string[]> = {
    'CAPTURED': ['CLARIFYING', 'THINKING'],
    'CLARIFYING': ['THINKING', 'CAPTURED'],
    'THINKING': ['DECIDED', 'CLARIFYING'],
    'DECIDED': ['IN_PROGRESS', 'THINKING'],
    'IN_PROGRESS': ['IN_REVIEW', 'DECIDED'],
    'IN_REVIEW': ['CLOSED', 'IN_PROGRESS'],
    'CLOSED': [],
    'ARCHIVED': []
  };

  private readonly LOGGED_FIELDS = [
    'status', 'assignee_id', 'priority', 'parent_id', 'category_id'
  ];

  public validateInvariants(sql: string): InvariantValidationResult {
    const upperSql = sql.toUpperCase();
    const lowerSql = sql.toLowerCase();

    if (upperSql.startsWith('DELETE') && lowerSql.includes('work_items')) {
      return {
        valid: false,
        error: 'Physical deletion of work items is not allowed. Use status = ARCHIVED instead'
      };
    }

    if (upperSql.startsWith('UPDATE') && lowerSql.includes('work_items')) {
      const immutableCheck = this.checkImmutableFields(sql);
      if (!immutableCheck.valid) {
        return immutableCheck;
      }

      const parentCheck = this.checkParentIdUpdate(sql);
      if (!parentCheck.valid) {
        return parentCheck;
      }

      const statusCheck = this.checkStatusTransition(sql);
      if (!statusCheck.valid) {
        return statusCheck;
      }
    }

    if (upperSql.startsWith('INSERT') && lowerSql.includes('work_items')) {
      const parentCheck = this.checkParentIdInInsert(sql);
      if (!parentCheck.valid) {
        return parentCheck;
      }
    }

    return { valid: true };
  }

  private checkImmutableFields(sql: string): InvariantValidationResult {
    const lowerSql = sql.toLowerCase();
    
    for (const field of this.IMMUTABLE_FIELDS) {
      const pattern = new RegExp(`\\b${field}\\s*=`, 'i');
      if (pattern.test(lowerSql)) {
        return {
          valid: false,
          error: `Cannot modify immutable field: ${field}`
        };
      }
    }

    return { valid: true };
  }

  private checkParentIdUpdate(sql: string): InvariantValidationResult {
    const parentIdPattern = /parent_id\s*=\s*(\d+|NULL)/i;
    const match = sql.match(parentIdPattern);
    
    if (match) {
      const parentId = match[1];
      
      if (parentId !== 'NULL') {
        const wherePattern = /WHERE\s+.*?id\s*=\s*(\d+)/i;
        const whereMatch = sql.match(wherePattern);
        
        if (whereMatch) {
          const workItemId = whereMatch[1];
          if (workItemId === parentId) {
            return {
              valid: false,
              error: 'A work item cannot be its own parent'
            };
          }
        }
      }
    }

    return { valid: true };
  }

  private checkParentIdInInsert(sql: string): InvariantValidationResult {
    return { valid: true };
  }

  private checkStatusTransition(sql: string): InvariantValidationResult {
    const statusPattern = /status\s*=\s*'([A-Z_]+)'/i;
    const match = sql.match(statusPattern);
    
    if (!match) {
      return { valid: true };
    }

    const newStatus = match[1];

    if (newStatus === 'ARCHIVED') {
      return { valid: true };
    }

    return { valid: true };
  }

  public requiresLogging(sql: string): boolean {
    const lowerSql = sql.toLowerCase();
    
    if (!lowerSql.includes('work_items')) {
      return false;
    }

    const upperSql = sql.toUpperCase();
    if (!upperSql.startsWith('UPDATE') && !upperSql.startsWith('INSERT')) {
      return false;
    }

    for (const field of this.LOGGED_FIELDS) {
      if (lowerSql.includes(field)) {
        return true;
      }
    }

    return false;
  }

  public extractChangedFields(sql: string): string[] {
    const fields: string[] = [];
    const lowerSql = sql.toLowerCase();

    for (const field of this.LOGGED_FIELDS) {
      const pattern = new RegExp(`\\b${field}\\s*=`, 'i');
      if (pattern.test(lowerSql)) {
        fields.push(field);
      }
    }

    return fields;
  }
}
