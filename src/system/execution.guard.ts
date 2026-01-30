export interface ExecutionContext {
  eventId?: bigint;
  ruleId: bigint;
  promptId: bigint;
  entityType: string;
  entityId?: bigint;
}

export interface ExecutionGuardResult {
  allowed: boolean;
  reason?: string;
}

export class ExecutionGuard {
  private readonly MAX_EXECUTIONS_PER_EVENT = 3;
  private readonly executionHistory: Map<string, number> = new Map();
  private readonly activeExecutions: Set<string> = new Set();

  public canExecute(context: ExecutionContext): ExecutionGuardResult {
    const eventKey = context.eventId ? context.eventId.toString() : 'no-event';
    const ruleKey = `${eventKey}:${context.ruleId}`;
    const executionKey = `${context.promptId}:${context.entityType}:${context.entityId || 'none'}`;

    if (this.activeExecutions.has(executionKey)) {
      return {
        allowed: false,
        reason: 'Recursive execution detected - same prompt already running for this entity'
      };
    }

    const executionCount = this.executionHistory.get(eventKey) || 0;
    if (executionCount >= this.MAX_EXECUTIONS_PER_EVENT) {
      return {
        allowed: false,
        reason: `Maximum executions per event (${this.MAX_EXECUTIONS_PER_EVENT}) exceeded`
      };
    }

    const ruleExecutionCount = this.executionHistory.get(ruleKey) || 0;
    if (ruleExecutionCount > 0) {
      return {
        allowed: false,
        reason: 'Rule already executed for this event - no re-entry allowed'
      };
    }

    return { allowed: true };
  }

  public markExecutionStart(context: ExecutionContext): void {
    const eventKey = context.eventId ? context.eventId.toString() : 'no-event';
    const ruleKey = `${eventKey}:${context.ruleId}`;
    const executionKey = `${context.promptId}:${context.entityType}:${context.entityId || 'none'}`;

    this.activeExecutions.add(executionKey);
    
    const eventCount = this.executionHistory.get(eventKey) || 0;
    this.executionHistory.set(eventKey, eventCount + 1);
    
    this.executionHistory.set(ruleKey, 1);
  }

  public markExecutionEnd(context: ExecutionContext): void {
    const executionKey = `${context.promptId}:${context.entityType}:${context.entityId || 'none'}`;
    this.activeExecutions.delete(executionKey);
  }

  public clearEventHistory(eventId: bigint): void {
    const eventKey = eventId.toString();
    this.executionHistory.delete(eventKey);
    
    const keysToDelete: string[] = [];
    for (const key of this.executionHistory.keys()) {
      if (key.startsWith(`${eventKey}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.executionHistory.delete(key));
  }
}
