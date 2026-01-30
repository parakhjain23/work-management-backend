# PHASE 5: Event Rules & System Prompt Execution Engine

## Overview

PHASE 5 introduces controlled automation through an event-driven system prompt execution engine. This enables the system to detect meaningful events and execute predefined AI prompts deterministically.

## Core Concepts

### Event
A fact that something happened in the system.

**Examples**:
- `work_item` CREATED
- `work_item` status UPDATED
- `custom_field` ADDED

Events are automatically logged by the event logger in Phase 2.

### System Prompt
A predefined AI instruction that runs when specific conditions are met.

**Example**:
```
"When a work item is created, analyze the title and description 
to suggest appropriate category and priority."
```

### System Prompt Rule
A rule that matches events to prompts.

**Structure**:
- `event_type` - CREATE, UPDATE, DELETE
- `entity_type` - work_item, category, etc.
- `field_name` - Optional specific field
- `system_prompt_id` - Which prompt to execute
- `priority` - Execution order

## Database Schema

### system_prompts
```sql
CREATE TABLE system_prompts (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  prompt_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

### system_prompt_rules
```sql
CREATE TABLE system_prompt_rules (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50),      -- CREATE, UPDATE, DELETE
  entity_type VARCHAR(50),     -- work_item, category, etc.
  field_name VARCHAR(100),     -- Optional: status, priority, etc.
  system_prompt_id BIGINT,
  priority INT DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### system_prompt_executions
```sql
CREATE TABLE system_prompt_executions (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT,
  rule_id BIGINT,
  prompt_id BIGINT,
  sql_generated TEXT,
  execution_result TEXT,
  success BOOLEAN,
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

## Execution Flow

```
1. Mutation occurs (e.g., work_item created)
   ↓
2. Event logged by EventLogger
   ↓
3. Event triggers system prompt check (async)
   ↓
4. EventDispatcher finds matching rules
   ↓
5. For each matching rule:
   a. ExecutionGuard checks if execution allowed
   b. PromptExecutor calls AI with system prompt
   c. AI returns structured actions
   d. Actions validated through full pipeline
   e. Actions executed safely
   f. Results logged
   ↓
6. If any step fails → abort safely, log error
```

## Execution Guards

### Guard 1: Maximum Executions Per Event
- Limit: 3 executions per event
- Prevents runaway automation
- Configurable threshold

### Guard 2: No Recursive Triggering
- Same prompt cannot run twice for same entity
- Prevents infinite loops
- Tracked via execution context

### Guard 3: No Rule Re-Entry
- Each rule executes at most once per event
- Prevents duplicate processing
- Ensures deterministic behavior

### Guard 4: Scope Enforcement
- System prompts respect threadId scopes
- Cannot act outside event scope
- All Phase 3 rules still apply

## Implementation Components

### EventDispatcher
**File**: `src/system/event.dispatcher.ts`

**Responsibilities**:
- Read new events
- Match against active rules
- Fetch system prompts
- Queue executions

**Methods**:
- `findMatchingRules(event)` - Find applicable rules
- `getSystemPrompt(promptId)` - Fetch prompt text

### PromptExecutor
**File**: `src/system/prompt.executor.ts`

**Responsibilities**:
- Execute system prompts via AI
- Validate AI responses
- Execute returned actions
- Log all executions

**Methods**:
- `executeForEvent(event)` - Main entry point
- `executePrompt(match, event)` - Execute single prompt
- `callAI(promptText, event)` - AI integration point
- `logExecution(context, success, result, error)` - Audit logging

### ExecutionGuard
**File**: `src/system/execution.guard.ts`

**Responsibilities**:
- Prevent infinite loops
- Enforce execution limits
- Track active executions
- Manage execution history

**Methods**:
- `canExecute(context)` - Check if execution allowed
- `markExecutionStart(context)` - Track execution start
- `markExecutionEnd(context)` - Track execution end
- `clearEventHistory(eventId)` - Cleanup after event

## AI Response Format

System prompts must return structured JSON:

```json
{
  "actions": [
    {
      "type": "UPDATE",
      "sql": "UPDATE work_items SET priority = 'HIGH' WHERE id = 123"
    }
  ]
}
```

**Constraints**:
- AI cannot invent arbitrary SQL
- All SQL validated through full pipeline
- Actions must be within event scope
- Invalid responses are rejected and logged

## Error Handling

### System Prompt Failure
- Log error to `system_prompt_executions`
- Optionally disable rule
- Do not retry blindly
- Alert monitoring system

### Invalid AI Output
- Log error with details
- Stop execution immediately
- Do not attempt recovery
- Requires manual review

### SQL Rejection
- Log which validation failed
- Stop execution
- Preserve event for debugging
- No partial execution

## Observability

Every execution logs:
- **Event ID** - Which event triggered it
- **Rule ID** - Which rule matched
- **Prompt ID** - Which prompt executed
- **SQL Generated** - What AI produced
- **Execution Result** - Success or failure
- **Error Message** - If failed, why
- **Timestamp** - When it happened

**Query Example**:
```sql
SELECT 
  spe.executed_at,
  sp.name as prompt_name,
  spe.success,
  spe.error_message
FROM system_prompt_executions spe
JOIN system_prompts sp ON sp.id = spe.prompt_id
WHERE spe.success = false
ORDER BY spe.executed_at DESC
LIMIT 10;
```

## Example Use Cases

### Use Case 1: Category Detection
**Trigger**: work_item CREATED

**System Prompt**:
```
Analyze the work item title and description.
Suggest the most appropriate category from available categories.
Return UPDATE SQL to set category_id.
```

**AI Response**:
```json
{
  "actions": [
    {
      "type": "UPDATE",
      "sql": "UPDATE work_items SET category_id = 2 WHERE id = 123"
    }
  ]
}
```

### Use Case 2: Priority Escalation
**Trigger**: work_item status UPDATED to IN_REVIEW

**System Prompt**:
```
If work item has been in IN_REVIEW for more than 48 hours,
escalate priority to HIGH.
```

**AI Response**:
```json
{
  "actions": [
    {
      "type": "UPDATE",
      "sql": "UPDATE work_items SET priority = 'HIGH' WHERE id = 123"
    }
  ]
}
```

### Use Case 3: Subtask Creation
**Trigger**: work_item CREATED with specific keywords

**System Prompt**:
```
If work item title contains "epic" or "large feature",
suggest breaking it into 3-5 subtasks.
```

**AI Response**:
```json
{
  "actions": [
    {
      "type": "UPDATE",
      "sql": "INSERT INTO work_items (title, parent_id, category_id, status, created_at, updated_at) VALUES ('Subtask 1', 123, 1, 'CAPTURED', NOW(), NOW())"
    }
  ]
}
```

## Safety Guarantees

1. **Bounded Execution** - Max 3 actions per event
2. **No Infinite Loops** - Recursive detection
3. **Full Validation** - All Phase 2-4 rules apply
4. **Audit Trail** - Every execution logged
5. **Fail-Safe** - Errors don't cascade
6. **Deterministic** - Same event → same behavior

## Integration with Event Logger

Events are triggered asynchronously after mutations:

```typescript
// In EventLogger.logMutation()
setImmediate(() => {
  this.triggerSystemPrompts(event).catch(err => {
    console.error('[EVENT] System prompt trigger failed:', err);
  });
});
```

**Benefits**:
- Non-blocking - doesn't slow down mutations
- Isolated - failures don't affect user operations
- Async - can take time without timeout
- Safe - errors are caught and logged

## What's NOT Implemented

- ❌ RAG / knowledge base integration
- ❌ User-defined automation UI
- ❌ Complex scheduling / cron jobs
- ❌ External API integrations
- ❌ Real-time notifications

These are intentionally excluded to keep the system simple and safe.

## Testing Scenarios

### Test 1: Basic Execution
```typescript
// Create work item
INSERT INTO work_items (...) VALUES (...)
// Expected: System prompt executes, suggests category
```

### Test 2: Recursive Prevention
```typescript
// System prompt tries to trigger itself
// Expected: Blocked by ExecutionGuard
```

### Test 3: Invalid AI Response
```typescript
// AI returns malformed JSON
// Expected: Logged as error, execution stops
```

### Test 4: SQL Validation Failure
```typescript
// AI returns SQL violating invariants
// Expected: Rejected by invariant guard, logged
```

### Test 5: Disabled Rule
```typescript
// Rule is_active = false
// Expected: No execution, no error
```

## Performance Considerations

- Events processed asynchronously
- No impact on mutation latency
- Execution history cleaned periodically
- Database queries optimized with indexes
- Configurable execution limits

## Future Enhancements

Possible additions (not in this phase):
- Conditional rules (if/then logic)
- Time-based triggers (cron-like)
- Multi-step workflows
- External integrations
- User-configurable prompts

All can be added without breaking existing system.
