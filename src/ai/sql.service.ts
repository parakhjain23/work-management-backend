import { getPrismaClient } from '../db/prisma.js';
import { SqlValidator } from './sql.validator.js';
import { ScopeValidator, ThreadScope } from './scope.validator.js';
import { InvariantGuard } from './invariant.guard.js';

export interface SqlExecutionResult {
  success: boolean;
  type?: 'SELECT' | 'MUTATION';
  data?: any[];
  rowsAffected?: number;
  returnedIds?: (number | number)[];
  error?: string;
}

export class SqlService {
  private validator: SqlValidator;
  private scopeValidator: ScopeValidator;
  private invariantGuard: InvariantGuard;

  constructor() {
    this.validator = new SqlValidator();
    this.scopeValidator = new ScopeValidator();
    this.invariantGuard = new InvariantGuard();
  }

  public async executeSql(sql: string, threadId?: string): Promise<SqlExecutionResult> {
    const validation = this.validator.validate(sql);
    
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const statementType = validation.statementType!;

    // CRITICAL: Block all mutation SQL - AI must use intent API instead
    if (statementType !== 'SELECT') {
      return {
        success: false,
        error: 'Mutation SQL is not allowed. Use /ai/intent API for INSERT, UPDATE, DELETE operations.'
      };
    }

    const scopeParseResult = this.scopeValidator.parseThreadId(threadId);
    if (!scopeParseResult.valid) {
      return {
        success: false,
        error: scopeParseResult.error
      };
    }

    const scopeValidation = this.scopeValidator.validateSqlForScope(sql, scopeParseResult.scope!);
    if (!scopeValidation.valid) {
      return {
        success: false,
        error: scopeValidation.error
      };
    }

    const invariantValidation = this.invariantGuard.validateInvariants(sql);
    if (!invariantValidation.valid) {
      return {
        success: false,
        error: invariantValidation.error
      };
    }

    try {
      return await this.executeSelect(sql);
    } catch (error) {
      console.error('SQL execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query execution failed'
      };
    }
  }

  private async executeSelect(sql: string): Promise<SqlExecutionResult> {
    const prisma = getPrismaClient();
    const sqlWithLimit = this.validator.ensureLimit(sql);
    
    const data = await prisma.$queryRawUnsafe(sqlWithLimit);
    
    // Convert BigInt values to strings for JSON serialization
    const serializedData = this.serializeBigInt(Array.isArray(data) ? data : [data]);
    
    return {
      success: true,
      type: 'SELECT',
      data: serializedData
    };
  }

  private serializeBigInt(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }
    
    if (typeof data === 'bigint') {
      return data.toString();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.serializeBigInt(item));
    }
    
    if (typeof data === 'object') {
      const serialized: any = {};
      for (const key in data) {
        serialized[key] = this.serializeBigInt(data[key]);
      }
      return serialized;
    }
    
    return data;
  }

}
