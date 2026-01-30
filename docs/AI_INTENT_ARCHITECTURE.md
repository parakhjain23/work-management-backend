# AI Intent-Based Architecture Documentation

## Overview

This document describes the new intent-based architecture that replaces direct SQL mutations with a clean, safe, and maintainable approach for AI interactions.

---

## Architecture Change Summary

### OLD Architecture (Removed)
```
AI → Generates SQL → /ai/execute-sql → Direct DB Mutation
```

**Problems:**
- ❌ AI can destroy database
- ❌ No event boundaries
- ❌ RAG updates coupled to SQL parsing
- ❌ System prompts coupled to SQL parsing
- ❌ Hard to test and maintain

### NEW Architecture (Implemented)
```
AI → Generates Intent → /ai/intent → Intent Router → Service Layer → Event Dispatcher
                                                                            ↓
                                                    ┌───────────────────────┴───────────────────────┐
                                                    ↓                                               ↓
                                              RAG Producer                                  System Prompts
```

**Benefits:**
- ✅ AI cannot destroy database
- ✅ Clean event boundaries
- ✅ Deterministic RAG indexing
- ✅ Deterministic system prompts
- ✅ Easy to test
- ✅ Better maintainability

---

## Component Architecture

### 1. SQL Executor (Restricted)

**File:** `src/ai/sql.service.ts`

**Purpose:** Read-only reporting queries

**Changes:**
- ✅ Blocks INSERT, UPDATE, DELETE
- ✅ Allows only SELECT
- ✅ Returns clear error message

**Code:**
```typescript
// CRITICAL: Block all mutation SQL
if (statementType !== 'SELECT') {
  return {
    success: false,
    error: 'Mutation SQL is not allowed. Use /ai/intent API for INSERT, UPDATE, DELETE operations.'
  };
}
```

**Usage:**
```bash
# ✅ Allowed
POST /ai/execute-sql
{
  "sql": "SELECT * FROM work_items WHERE status = 'IN_PROGRESS'"
}

# ❌ Blocked
POST /ai/execute-sql
{
  "sql": "INSERT INTO work_items ..."
}
# Response: 400 - "Mutation SQL is not allowed. Use /ai/intent API..."
```

---

### 2. Intent Types

**File:** `src/ai/intent.types.ts`

**Purpose:** Define all possible AI intents and their payload contracts

**Intent Types:**
```typescript
enum IntentType {
  CREATE_WORK_ITEM = 'create_work_item',
  UPDATE_WORK_ITEM = 'update_work_item',
  DELETE_WORK_ITEM = 'delete_work_item',
  ADD_CHILD_WORK_ITEM = 'add_child_work_item',
  CREATE_CATEGORY = 'create_category',
  UPDATE_CATEGORY = 'update_category',
  CREATE_CUSTOM_FIELD = 'create_custom_field',
  UPDATE_CUSTOM_FIELD_VALUE = 'update_custom_field_value',
  UPDATE_WORK_ITEM_STATUS = 'update_work_item_status'
}
```

**Payload Contracts:**

Each intent has a strict payload structure:

```typescript
// CREATE_WORK_ITEM
{
  title: string;              // Required
  description?: string;       // Optional
  category_id?: number;       // Optional (defaults to 1)
  priority?: WorkItemPriority;
  status?: WorkItemStatus;
}

// UPDATE_WORK_ITEM
{
  work_item_id: number;       // Required
  fields: {                   // Required
    title?: string;
    description?: string;
    status?: WorkItemStatus;
    priority?: WorkItemPriority;
    category_id?: number;
  }
}

// UPDATE_CUSTOM_FIELD_VALUE
{
  work_item_id: number;       // Required
  values: {                   // Required
    [key_name: string]: any;  // Dynamic based on field definitions
  }
}
```

---

### 3. Intent Router

**File:** `src/ai/intent.router.ts`

**Purpose:** Route intents to appropriate service methods

**Responsibilities:**
1. Validate intent type
2. Validate payload shape
3. Enforce threadId scope
4. Route to correct service
5. Dispatch events after mutation

**Flow:**
```typescript
route(request: IntentRequest) {
  // 1. Validate intent type
  if (!Object.values(IntentType).includes(request.intent)) {
    return error;
  }

  // 2. Validate threadId scope
  const scopeValidation = this.validateThreadScope(...);
  if (!scopeValidation.valid) {
    return error;
  }

  // 3. Route to handler
  switch (request.intent) {
    case IntentType.CREATE_WORK_ITEM:
      return await this.handleCreateWorkItem(...);
    // ... other intents
  }
}
```

**Scope Validation:**
```typescript
// Global scope: "org:1:global"
// - All intents allowed
// - No restrictions

// WorkItem scope: "workItem:123"
// - Only operations on work item 123
// - Prevents cross-work-item mutations
// - Scope violation returns 403
```

---

### 4. Event Dispatcher

**File:** `src/events/event.dispatcher.ts`

**Purpose:** Single hook point for all mutation events

**Event Structure:**
```typescript
interface MutationEvent {
  entity: EntityType;           // work_item, category, custom_field_value, etc.
  action: ActionType;           // create, update, delete
  entity_id: number | bigint;   // ID of affected entity
  changed_fields?: string[];    // Which fields changed
  metadata?: any;               // Additional context
  org_id?: number | bigint;
  user_id?: number | bigint;
}
```

**Event Flow:**
```typescript
dispatch(event: MutationEvent) {
  // Execute asynchronously (don't block response)
  setImmediate(async () => {
    // 1. Trigger RAG Producer
    await this.triggerRagProducer(event);

    // 2. Trigger System Prompts
    await this.triggerSystemPrompts(event);

    // 3. Future: Webhooks, notifications, etc.
  });
}
```

**Usage in Services:**
```typescript
// After successful mutation
await eventDispatcher.dispatch(
  EventDispatcher.workItemEvent(
    ActionType.UPDATE,
    workItemId,
    ['status', 'priority']  // Changed fields
  )
);
```

---

### 5. System Prompt Runner (Placeholder)

**File:** `src/systemPrompts/runner.ts`

**Purpose:** Execute system prompts based on events

**Current Implementation:**
- ✅ Logs what WOULD happen
- ✅ Doesn't execute AI yet
- ✅ Keeps architecture clean

**Example Log:**
```
[System Prompt Runner] Would process event: {
  entity: 'work_item',
  action: 'update',
  entity_id: '42',
  changed_fields: ['status']
}
[System Prompt Runner] Would trigger: status_change prompts
[System Prompt Runner] ✓ Event logged (no execution in POC)
```

**Future Implementation:**
```typescript
async processEvent(event: MutationEvent) {
  // 1. Query system_prompts table for matching rules
  const prompts = await this.findMatchingPrompts(event);

  // 2. Execute each matching prompt
  for (const prompt of prompts) {
    await this.executePrompt(prompt, event);
  }

  // 3. Log execution results
}
```

---

### 6. RAG Producer (Updated)

**File:** `src/rag/rag.producer.ts`

**Purpose:** Index work items to vector database

**Integration with Event Dispatcher:**
```typescript
// Event Dispatcher calls RAG Producer
private async triggerRagProducer(event: MutationEvent) {
  const { RagProducer } = await import('../rag/rag.producer.js');
  const ragProducer = new RagProducer();

  // Convert to legacy event format
  const legacyEvent = {
    entity_type: event.entity,
    action: event.action.toUpperCase(),
    entity_id: event.entity_id,
    sql: undefined  // No SQL in intent-based flow
  };

  await ragProducer.handleEvent(legacyEvent);
}
```

**Behavior:**
- ✅ Indexes work items on create/update
- ✅ Deletes from index on delete
- ✅ Updates on custom field changes
- ✅ Updates on category name changes

---

## API Reference

### POST /ai/intent

**Purpose:** Single entrypoint for all AI mutations

**Request:**
```json
{
  "intent": "create_work_item",
  "payload": {
    "title": "Fix payment gateway timeout",
    "description": "Payment processing fails after 30 seconds",
    "priority": "HIGH",
    "category_id": 1
  },
  "threadId": "org:1:global"
}
```

**Response (Success):**
```json
{
  "success": true,
  "result": {
    "type": "work_item_created",
    "id": "42",
    "data": {
      "id": "42",
      "title": "Fix payment gateway timeout",
      "status": "CAPTURED",
      "priority": "HIGH",
      ...
    }
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "title is required"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid payload or missing required fields
- `403` - Scope violation
- `404` - Entity not found
- `409` - Conflict (duplicate key, etc.)
- `500` - Server error

---

## Intent Examples

### 1. Create Work Item

```json
POST /ai/intent
{
  "intent": "create_work_item",
  "payload": {
    "title": "Fix payment gateway timeout",
    "description": "Payment processing fails after 30 seconds",
    "priority": "HIGH",
    "category_id": 1,
    "due_date": "2024-02-15"
  },
  "threadId": "org:1:global"
}
```

**What Happens:**
1. Intent Router validates payload
2. WorkItemsService.create() executes
3. Work item created in database
4. Work item log created
5. Event dispatched
6. RAG Producer indexes work item
7. System Prompt Runner logs event
8. Response returned to AI

---

### 2. Update Work Item

```json
POST /ai/intent
{
  "intent": "update_work_item",
  "payload": {
    "work_item_id": 42,
    "fields": {
      "status": "IN_PROGRESS",
      "priority": "URGENT"
    }
  },
  "threadId": "workItem:42"
}
```

**What Happens:**
1. Scope validated (threadId matches work_item_id)
2. WorkItemsService.update() executes
3. Work item updated in database
4. Work item log created
5. Event dispatched with changed_fields: ['status', 'priority']
6. RAG Producer updates index
7. System Prompt Runner checks for status_change prompts
8. Response returned

---

### 3. Update Custom Field Values

```json
POST /ai/intent
{
  "intent": "update_custom_field_value",
  "payload": {
    "work_item_id": 42,
    "values": {
      "root_cause": "Database connection pool exhaustion",
      "customer_impact": "High",
      "estimated_hours": 8
    }
  },
  "threadId": "workItem:42"
}
```

**What Happens:**
1. CustomFieldsService.updateValues() executes
2. Values upserted in custom_field_values table
3. Type validation performed
4. Work item log created
5. Event dispatched with changed_fields: ['root_cause', 'customer_impact', 'estimated_hours']
6. RAG Producer updates work item document
7. Response returned

---

### 4. Add Child Work Item

```json
POST /ai/intent
{
  "intent": "add_child_work_item",
  "payload": {
    "parent_id": 42,
    "title": "Increase database connection pool size",
    "description": "Update configuration to allow 100 max connections",
    "priority": "HIGH"
  },
  "threadId": "workItem:42"
}
```

**What Happens:**
1. Scope validated (threadId matches parent_id)
2. WorkItemsService.createChild() executes
3. Child inherits category_id from parent
4. Child work item created
5. Work item log created
6. Event dispatched
7. RAG Producer indexes child work item
8. Response returned

---

### 5. Create Category

```json
POST /ai/intent
{
  "intent": "create_category",
  "payload": {
    "key_name": "features",
    "name": "Feature Requests",
    "external_tool": "linear"
  },
  "threadId": "org:1:global"
}
```

---

### 6. Update Work Item Status (Convenience)

```json
POST /ai/intent
{
  "intent": "update_work_item_status",
  "payload": {
    "work_item_id": 42,
    "status": "CLOSED"
  },
  "threadId": "workItem:42"
}
```

---

## ThreadId Scope Enforcement

### Global Scope
```
threadId: "org:1:global"
```

**Allowed:**
- Create any work item
- Create categories
- Create custom fields
- Update any work item
- Delete any work item

**Use Case:** Initial conversation, creating new work items

---

### WorkItem Scope
```
threadId: "workItem:42"
```

**Allowed:**
- Update work item 42
- Add children to work item 42
- Update custom fields of work item 42
- Delete work item 42

**Blocked:**
- Update work item 43 (scope violation → 403)
- Add child to work item 43 (scope violation → 403)

**Use Case:** Conversation focused on specific work item

---

## Error Handling

### Validation Errors (400)
```json
{
  "success": false,
  "error": "title is required"
}
```

### Scope Violations (403)
```json
{
  "success": false,
  "error": "Scope violation: work_item_id does not match threadId"
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": "Work item not found"
}
```

### Conflicts (409)
```json
{
  "success": false,
  "error": "Category with this key_name already exists"
}
```

### Server Errors (500)
```json
{
  "success": false,
  "error": "Intent execution failed"
}
```

---

## GTWY Chatbot Configuration

### Tool 1: reporting_sql (Read-only)

```json
{
  "name": "reporting_sql",
  "description": "Execute SELECT queries for reporting and data retrieval",
  "endpoint": "POST /ai/execute-sql",
  "parameters": {
    "sql": "string (SELECT query only)"
  }
}
```

**Example:**
```
User: "Show me all high priority bugs"
AI: Uses reporting_sql tool
    → POST /ai/execute-sql
    → { "sql": "SELECT * FROM work_items WHERE priority = 'HIGH' AND category_id = 1" }
```

---

### Tool 2: intent_executor (Mutations)

```json
{
  "name": "intent_executor",
  "description": "Execute mutations (create, update, delete) via intent API",
  "endpoint": "POST /ai/intent",
  "parameters": {
    "intent": "string (intent type)",
    "payload": "object (intent-specific payload)",
    "threadId": "string (scope identifier)"
  }
}
```

**Example:**
```
User: "Create a work item for fixing the payment timeout"
AI: Uses intent_executor tool
    → POST /ai/intent
    → {
        "intent": "create_work_item",
        "payload": {
          "title": "Fix payment timeout",
          "description": "Payment processing fails after 30 seconds",
          "priority": "HIGH",
          "category_id": 1
        },
        "threadId": "org:1:global"
      }
```

---

## Testing

### Test 1: SQL Executor Blocks Mutations

```bash
# Should fail
curl -X POST http://localhost:3000/ai/execute-sql \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "INSERT INTO work_items (category_id, title) VALUES (1, '\''Test'\'')"
  }'

# Expected: 400 - "Mutation SQL is not allowed. Use /ai/intent API..."
```

---

### Test 2: Create Work Item via Intent

```bash
curl -X POST http://localhost:3000/ai/intent \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "create_work_item",
    "payload": {
      "title": "Fix payment gateway timeout",
      "description": "Payment processing fails",
      "priority": "HIGH",
      "category_id": 1
    },
    "threadId": "org:1:global"
  }'

# Expected: 200 - Work item created, event dispatched, RAG indexed
```

---

### Test 3: Update Custom Fields

```bash
curl -X POST http://localhost:3000/ai/intent \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "update_custom_field_value",
    "payload": {
      "work_item_id": 1,
      "values": {
        "root_cause": "Database timeout",
        "severity": 9
      }
    },
    "threadId": "workItem:1"
  }'

# Expected: 200 - Custom fields updated, event dispatched, RAG updated
```

---

### Test 4: Scope Violation

```bash
curl -X POST http://localhost:3000/ai/intent \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "update_work_item",
    "payload": {
      "work_item_id": 42,
      "fields": { "status": "CLOSED" }
    },
    "threadId": "workItem:1"
  }'

# Expected: 403 - "Scope violation: work_item_id does not match threadId"
```

---

## Event Flow Diagram

```
User Request
    ↓
POST /ai/intent
    ↓
Intent Controller
    ↓
Intent Router
    ├─→ Validate intent type
    ├─→ Validate payload
    ├─→ Validate scope
    └─→ Route to service
           ↓
    Service Layer (CRUD)
           ├─→ Execute database operation
           ├─→ Create work item log
           └─→ Return result
                  ↓
    Event Dispatcher
           ├─→ Dispatch event (async)
           │
           ├─→ RAG Producer
           │      ├─→ Build document
           │      ├─→ Index to Hippocampus
           │      └─→ Log result
           │
           └─→ System Prompt Runner
                  ├─→ Find matching prompts
                  ├─→ Log what would execute
                  └─→ (Future: Execute AI)
                         ↓
    Response to AI
```

---

## Migration Guide

### For AI Chatbot

**Before:**
```javascript
// AI generates SQL
const sql = "INSERT INTO work_items (title, category_id) VALUES ('Fix bug', 1)";
await executeSql(sql);
```

**After:**
```javascript
// AI generates intent
const intent = {
  intent: "create_work_item",
  payload: {
    title: "Fix bug",
    category_id: 1
  },
  threadId: "org:1:global"
};
await executeIntent(intent);
```

---

### For Frontend

**No Changes Required!**

Frontend continues to use REST CRUD APIs:
- `POST /work-items`
- `PATCH /work-items/:id`
- `DELETE /work-items/:id`

AI path is completely separate.

---

## Benefits Achieved

### 🔒 Safety
- AI cannot execute DROP, TRUNCATE, ALTER
- AI cannot delete all data
- AI cannot corrupt database

### 🧩 Clean Boundaries
- Clear separation: AI intents vs REST APIs
- Single event hook point
- Easy to add new event subscribers

### 🧠 Deterministic Behavior
- RAG updates are predictable
- System prompts trigger reliably
- No SQL parsing fragility

### 🧪 Testability
- Easy to test each intent
- Easy to mock services
- Easy to verify events

### 📈 Maintainability
- Add new intents easily
- Change service logic without affecting AI
- Clear architecture for new developers

---

## Future Enhancements

### 1. Batch Intents
```json
{
  "intents": [
    { "intent": "create_work_item", "payload": {...} },
    { "intent": "update_custom_field_value", "payload": {...} }
  ],
  "threadId": "org:1:global"
}
```

### 2. Intent Transactions
- Execute multiple intents atomically
- Rollback on failure

### 3. Intent Validation Schema
- JSON Schema validation
- Better error messages

### 4. Intent Rate Limiting
- Prevent AI from spamming intents
- Per-user quotas

### 5. Intent Audit Log
- Track all AI actions
- Compliance and debugging

---

## Conclusion

The intent-based architecture provides a **safe, clean, and maintainable** foundation for AI-first work management. It separates concerns, provides clear boundaries, and enables future enhancements without breaking existing functionality.

**Key Takeaway:** AI should express **intent**, not **implementation**. The backend decides how to execute that intent safely and correctly.

---

**Architecture Version**: 1.0  
**Last Updated**: January 29, 2024  
**Status**: ✅ Implemented and Ready for Testing
