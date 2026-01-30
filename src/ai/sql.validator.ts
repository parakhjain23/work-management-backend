export interface ValidationResult {
  valid: boolean;
  error?: string;
  statementType?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
}

export class SqlValidator {
  private readonly ALLOWED_STATEMENTS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  
  private readonly BLOCKED_KEYWORDS = [
    'DROP', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE',
    'CREATE INDEX', 'CREATE TABLE', 'DO', 'EXECUTE', 'CALL'
  ];

  private readonly WHITELISTED_TABLES = [
    'organizations',
    'work_items',
    'categories',
    'custom_field_meta_data',
    'custom_field_values',
    'work_item_logs',
    'category_followers',
    'event_logs'
  ];

  private readonly DEFAULT_LIMIT = 100;

  public validate(sql: string): ValidationResult {
    if (!sql || typeof sql !== 'string') {
      return { valid: false, error: 'SQL query is required' };
    }

    const trimmedSql = sql.trim();
    if (!trimmedSql) {
      return { valid: false, error: 'SQL query cannot be empty' };
    }

    const multiStatementCheck = this.checkMultipleStatements(trimmedSql);
    if (!multiStatementCheck.valid) {
      return multiStatementCheck;
    }

    const blockedKeywordCheck = this.checkBlockedKeywords(trimmedSql);
    if (!blockedKeywordCheck.valid) {
      return blockedKeywordCheck;
    }

    const statementTypeCheck = this.checkStatementType(trimmedSql);
    if (!statementTypeCheck.valid) {
      return statementTypeCheck;
    }

    const tableWhitelistCheck = this.checkTableWhitelist(trimmedSql);
    if (!tableWhitelistCheck.valid) {
      return tableWhitelistCheck;
    }

    if (statementTypeCheck.statementType === 'UPDATE' || statementTypeCheck.statementType === 'DELETE') {
      const whereClauseCheck = this.checkWhereClause(trimmedSql);
      if (!whereClauseCheck.valid) {
        return whereClauseCheck;
      }
    }

    return {
      valid: true,
      statementType: statementTypeCheck.statementType
    };
  }

  public ensureLimit(sql: string): string {
    const upperSql = sql.toUpperCase();
    if (upperSql.startsWith('SELECT') && !upperSql.includes('LIMIT')) {
      return `${sql.trim()} LIMIT ${this.DEFAULT_LIMIT}`;
    }
    return sql;
  }

  private checkMultipleStatements(sql: string): ValidationResult {
    const semicolonCount = (sql.match(/;/g) || []).length;
    if (semicolonCount > 1) {
      return { valid: false, error: 'Multiple statements are not allowed' };
    }
    return { valid: true };
  }

  private checkBlockedKeywords(sql: string): ValidationResult {
    const upperSql = sql.toUpperCase();
    for (const keyword of this.BLOCKED_KEYWORDS) {
      if (upperSql.includes(keyword)) {
        return { valid: false, error: `Blocked keyword detected: ${keyword}` };
      }
    }
    return { valid: true };
  }

  private checkStatementType(sql: string): ValidationResult {
    const upperSql = sql.toUpperCase().trim();
    
    for (const statement of this.ALLOWED_STATEMENTS) {
      if (upperSql.startsWith(statement)) {
        return {
          valid: true,
          statementType: statement as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
        };
      }
    }

    return {
      valid: false,
      error: 'Only SELECT, INSERT, UPDATE, and DELETE statements are allowed'
    };
  }

  private checkTableWhitelist(sql: string): ValidationResult {
    const lowerSql = sql.toLowerCase();
    
    const tablePattern = /(?:from|into|update|join)\s+([a-z_][a-z0-9_]*)/gi;
    const matches = [...lowerSql.matchAll(tablePattern)];
    
    for (const match of matches) {
      const tableName = match[1];
      if (!this.WHITELISTED_TABLES.includes(tableName)) {
        return {
          valid: false,
          error: `Table '${tableName}' is not in the whitelist`
        };
      }
    }

    return { valid: true };
  }

  private checkWhereClause(sql: string): ValidationResult {
    const upperSql = sql.toUpperCase();
    if (!upperSql.includes('WHERE')) {
      return {
        valid: false,
        error: 'UPDATE and DELETE statements must include a WHERE clause'
      };
    }
    return { valid: true };
  }
}
