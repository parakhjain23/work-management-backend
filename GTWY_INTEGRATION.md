# GTWY Chatbot Integration Guide

## Overview

This document describes how to integrate the GTWY chatbot with the Work OS backend.

**Important**: There is ONLY ONE chatbot agent. Conversation scope is determined by `threadId`.

## Architecture

```
GTWY (Managed Runtime)
├── UI Layer
├── LLM (GPT-4, etc.)
├── Conversation Memory (per threadId)
└── Tool Calling

Backend (Authority)
├── SQL Validation
├── Scope Enforcement
├── Execution
└── Event Detection
```

## GTWY Tools Configuration

Expose exactly **two tools** to GTWY:

### 1. fetch_schema

**Endpoint**: `GET /ai/schema`

**Purpose**: Provides AI with complete database schema awareness

**Response**:
```json
{
  "tables": {
    "work_items": {
      "primary_key": "id",
      "columns": { ... },
      "relations": { ... }
    }
  }
}
```

**When to use**: Before generating any SQL query

### 2. execute_sql

**Endpoint**: `POST /ai/execute-sql`

**Purpose**: Safe SQL execution with validation

**Request**:
```json
{
  "sql": "SELECT * FROM work_items WHERE id = 1",
  "threadId": "workItem:123"
}
```

**Response (SELECT)**:
```json
{
  "success": true,
  "type": "SELECT",
  "data": [...]
}
```

**Response (MUTATION)**:
```json
{
  "success": true,
  "type": "MUTATION",
  "rowsAffected": 1,
  "returnedIds": [123]
}
```

**Response (ERROR)**:
```json
{
  "success": false,
  "error": "Work item scope violation: Cannot modify work_item 456 from workItem:123 thread"
}
```

## Conversation Scopes

### Scope 1: Global / Homepage Chat

**threadId Format**: `org:{orgId}:global`

**Example**: `org:acme-corp:global`

**Purpose**:
- Capture raw user input
- Create new work items
- Query across organization
- Ask clarifying questions

**Allowed AI Actions**:
- ✅ CREATE work_items
- ✅ QUERY work_items (any)
- ✅ UPDATE work_items (only if explicitly referenced)
- ✅ ASK clarification questions

**Example Flow**:

```
User: "Customer says the app is slow"

AI:
1. Calls fetch_schema
2. Generates: INSERT INTO work_items (category_id, title, status, ...) VALUES (...)
3. Calls execute_sql with threadId: "org:acme-corp:global"
4. Returns: "Created work item #123: 'Customer says app is slow'"

Frontend:
- Opens work-item chat with threadId: "workItem:123"
```

### Scope 2: WorkItem-Scoped Chat

**threadId Format**: `workItem:{workItemId}`

**Example**: `workItem:123`

**Variables to Inject**:
```json
{
  "work_item_id": 123,
  "scope": "work_item"
}
```

**Purpose**:
- Operate on exactly ONE work item
- Add structure and details
- Create child work items
- Update status and fields

**Allowed AI Actions**:
- ✅ UPDATE this work_item only (id = {work_item_id})
- ✅ QUERY this work_item only
- ✅ CREATE child work_items (with parent_id = {work_item_id})
- ❌ UPDATE other work items
- ❌ DELETE this work item (unless explicitly requested)

**Backend Enforcement**:
- Rejects SQL touching other work_item IDs
- Enforces parent_id on child creation
- Returns 403 for scope violations

**Example Flow**:

```
User: "Mark this as urgent and assign to me"

AI:
1. Resolves "this" via threadId → work_item_id = 123
2. Calls fetch_schema (if needed)
3. Generates: UPDATE work_items SET priority = 'URGENT', assignee_id = 5 WHERE id = 123
4. Calls execute_sql with threadId: "workItem:123"
5. Returns: "Updated work item #123: Set priority to URGENT"
```

## Scope Validation Rules

### Global Chat Rules

- ✅ Can CREATE any work_item
- ✅ Can QUERY any work_item
- ✅ Can UPDATE work_items if user explicitly references them
- ❌ Should not UPDATE work_items without clear intent

### Work Item Chat Rules

- ✅ Can UPDATE work_items WHERE id = {work_item_id}
- ✅ Can INSERT work_items with parent_id = {work_item_id}
- ❌ Cannot UPDATE work_items WHERE id != {work_item_id}
- ❌ Cannot INSERT work_items with different parent_id

**Backend enforces these rules automatically.**

## Follow-Up Behavior

AI must:
- Treat consecutive messages in same thread as related
- Avoid creating duplicate work items
- Prefer UPDATE over CREATE when appropriate
- Use context from previous messages

**Example**:
```
User (in org:acme:global): "Customer feedback about slow performance"
AI: Creates work_item #123

User (same thread): "Make it high priority"
AI: Updates work_item #123 (not creates new one)
```

## Error Handling

### Validation Errors (400)
- Empty SQL
- Invalid statement type
- Malformed query

### Forbidden Errors (403)
- Blocked keywords (DROP, ALTER, etc.)
- Table not in whitelist
- Scope violations
- Missing WHERE clause on UPDATE/DELETE

### Execution Errors (400/500)
- Database errors
- Constraint violations
- Connection failures

**AI Response to Errors**:
- Explain the failure clearly
- Ask for clarification if needed
- Retry with corrected SQL if appropriate
- Never fabricate success

## Event Logging

After every successful mutation, backend logs:

```json
{
  "entity_type": "work_item",
  "action": "CREATE",
  "entity_id": 123,
  "sql": "INSERT INTO work_items ...",
  "metadata": { ... }
}
```

**Important**: Events are logged only. No system prompts are executed in this phase.

## Testing Scenarios

### 1. Work Item Creation (Global Chat)
```
threadId: "org:acme:global"
User: "Need to fix login bug"
Expected: Creates work_item, returns ID
```

### 2. Follow-Up Update (Global Chat)
```
threadId: "org:acme:global"
User: "Make it urgent"
Expected: Updates the work_item created in previous message
```

### 3. Scoped Update (Work Item Chat)
```
threadId: "workItem:123"
User: "Change status to in progress"
Expected: UPDATE work_items SET status = 'IN_PROGRESS' WHERE id = 123
```

### 4. Child Creation (Work Item Chat)
```
threadId: "workItem:123"
User: "Break this into 3 subtasks"
Expected: Creates 3 work_items with parent_id = 123
```

### 5. Cross-Scope Violation (Work Item Chat)
```
threadId: "workItem:123"
User: "Update work item 456"
Expected: 403 Forbidden - scope violation
```

### 6. Clarification Request (Global Chat)
```
threadId: "org:acme:global"
User: "Customer issue"
Expected: AI asks "What kind of issue?" before creating
```

## Integration Checklist

- [ ] Configure GTWY with two tools: fetch_schema, execute_sql
- [ ] Implement threadId passing from frontend
- [ ] Use `org:{orgId}:global` for homepage chat
- [ ] Use `workItem:{id}` for work-item chat
- [ ] Pass threadId in execute_sql requests
- [ ] Handle 403 errors gracefully in UI
- [ ] Open work-item chat after CREATE in global chat
- [ ] Test all validation scenarios

## What's NOT in This Phase

- ❌ System prompt execution
- ❌ Background automation
- ❌ RAG / knowledge base
- ❌ Authentication / permissions
- ❌ Multi-user collaboration
- ❌ Real-time updates

These will come in future phases.
