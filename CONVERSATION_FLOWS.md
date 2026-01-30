# Work OS Conversation Flows

## Overview

This document describes the end-to-end conversation flows for the Work OS AI assistant.

## Flow 1: Global Chat - Work Item Creation

### Context
- **threadId**: `org:acme-corp:global`
- **User Location**: Homepage
- **Conversation State**: New or ongoing

### Example Conversation

```
User: "Customer says the app is slow on mobile"

AI Process:
1. Calls fetch_schema to understand work_items structure
2. Determines this is feedback/issue
3. Generates SQL:
   INSERT INTO work_items (
     category_id, 
     title, 
     description, 
     status, 
     created_at, 
     updated_at
   ) VALUES (
     1, 
     'Customer says app is slow on mobile', 
     'Customer feedback regarding mobile performance', 
     'CAPTURED', 
     NOW(), 
     NOW()
   )
4. Calls execute_sql with threadId: "org:acme-corp:global"
5. Backend returns: { success: true, type: "MUTATION", returnedIds: [123] }

AI Response:
"I've created work item #123: 'Customer says app is slow on mobile' 
with status CAPTURED. Would you like to add more details or prioritize it?"

Frontend Action:
- Display work item #123 in UI
- Offer button to "Open work item chat"
- If clicked, navigate to work item with threadId: "workItem:123"
```

## Flow 2: Global Chat - Follow-Up Update

### Context
- **threadId**: `org:acme-corp:global` (same as Flow 1)
- **Previous Context**: Just created work item #123

### Example Conversation

```
User: "Make it high priority"

AI Process:
1. Resolves "it" from conversation context → work_item #123
2. Calls fetch_schema (cached)
3. Generates SQL:
   UPDATE work_items 
   SET priority = 'HIGH', updated_at = NOW() 
   WHERE id = 123
4. Calls execute_sql with threadId: "org:acme-corp:global"
5. Backend returns: { success: true, type: "MUTATION", rowsAffected: 1 }

AI Response:
"Updated work item #123 to HIGH priority."
```

## Flow 3: Work Item Chat - Scoped Update

### Context
- **threadId**: `workItem:123`
- **User Location**: Work item detail page
- **Variables Injected**: `{ "work_item_id": 123, "scope": "work_item" }`

### Example Conversation

```
User: "Change status to in progress and assign to me"

AI Process:
1. Resolves "this" via threadId → work_item_id = 123
2. Calls fetch_schema (if needed)
3. Generates SQL:
   UPDATE work_items 
   SET status = 'IN_PROGRESS', assignee_id = 5, updated_at = NOW() 
   WHERE id = 123
4. Calls execute_sql with threadId: "workItem:123"
5. Backend validates: SQL targets work_item 123 ✓
6. Backend returns: { success: true, type: "MUTATION", rowsAffected: 1 }

AI Response:
"Updated this work item to IN_PROGRESS and assigned to you."
```

## Flow 4: Work Item Chat - Child Creation

### Context
- **threadId**: `workItem:123`
- **User Location**: Work item detail page

### Example Conversation

```
User: "Break this into 3 subtasks: design, implementation, testing"

AI Process:
1. Resolves parent via threadId → parent_id = 123
2. Calls fetch_schema
3. Generates SQL (3 INSERTs):
   INSERT INTO work_items (
     category_id, title, parent_id, root_parent_id, status, created_at, updated_at
   ) VALUES (1, 'Design', 123, 123, 'CAPTURED', NOW(), NOW());
   
   INSERT INTO work_items (
     category_id, title, parent_id, root_parent_id, status, created_at, updated_at
   ) VALUES (1, 'Implementation', 123, 123, 'CAPTURED', NOW(), NOW());
   
   INSERT INTO work_items (
     category_id, title, parent_id, root_parent_id, status, created_at, updated_at
   ) VALUES (1, 'Testing', 123, 123, 'CAPTURED', NOW(), NOW());

Note: AI must send these as separate execute_sql calls (one statement per call)

4. Backend validates each: parent_id = 123 ✓
5. Backend returns IDs: [124, 125, 126]

AI Response:
"Created 3 subtasks:
- #124: Design
- #125: Implementation  
- #126: Testing

All are linked to this work item as parent."
```

## Flow 5: Work Item Chat - Scope Violation (Blocked)

### Context
- **threadId**: `workItem:123`
- **User attempts cross-scope operation**

### Example Conversation

```
User: "Also update work item 456 to high priority"

AI Process:
1. Generates SQL:
   UPDATE work_items SET priority = 'HIGH' WHERE id = 456
2. Calls execute_sql with threadId: "workItem:123"
3. Backend validates: SQL targets work_item 456, but thread is workItem:123 ✗
4. Backend returns: 
   { 
     success: false, 
     error: "Work item scope violation: Cannot modify work_item 456 from workItem:123 thread" 
   }

AI Response:
"I can't update work item #456 from this conversation. I can only modify work item #123 here. 
To update work item #456, please open its detail page or use the global chat."
```

## Flow 6: Global Chat - Clarification Request

### Context
- **threadId**: `org:acme-corp:global`
- **Ambiguous user input**

### Example Conversation

```
User: "Customer issue"

AI Process:
1. Recognizes insufficient information
2. Does NOT generate SQL yet

AI Response:
"I'd like to help you create a work item for this customer issue. 
Could you tell me more about:
- What kind of issue is it? (bug, feature request, feedback)
- Any specific details about the problem?"

User: "It's a bug - login button doesn't work on Safari"

AI Process:
1. Now has sufficient context
2. Calls fetch_schema
3. Generates INSERT SQL with detailed information
4. Creates work item

AI Response:
"Created work item #127: 'Login button doesn't work on Safari' 
categorized as a bug with status CAPTURED."
```

## Flow 7: Work Item Chat - Query Details

### Context
- **threadId**: `workItem:123`
- **User wants information**

### Example Conversation

```
User: "What's the current status and who's assigned?"

AI Process:
1. Resolves "this" via threadId → work_item_id = 123
2. Calls fetch_schema
3. Generates SQL:
   SELECT status, assignee_id, priority, created_at, updated_at 
   FROM work_items 
   WHERE id = 123
4. Calls execute_sql with threadId: "workItem:123"
5. Backend returns: { success: true, type: "SELECT", data: [{...}] }

AI Response:
"This work item is currently:
- Status: IN_PROGRESS
- Assigned to: User #5
- Priority: HIGH
- Created: 2 days ago
- Last updated: 30 minutes ago"
```

## Flow 8: Global Chat - Multi-Item Query

### Context
- **threadId**: `org:acme-corp:global`
- **User wants overview**

### Example Conversation

```
User: "Show me all high priority items"

AI Process:
1. Calls fetch_schema
2. Generates SQL:
   SELECT id, title, status, assignee_id 
   FROM work_items 
   WHERE priority = 'HIGH' 
   ORDER BY created_at DESC
3. Calls execute_sql with threadId: "org:acme-corp:global"
4. Backend adds LIMIT 100 automatically
5. Backend returns: { success: true, type: "SELECT", data: [{...}, {...}] }

AI Response:
"Found 5 high priority work items:
1. #123: Customer says app is slow on mobile (IN_PROGRESS)
2. #98: Fix payment gateway timeout (IN_REVIEW)
3. #87: Add dark mode support (DECIDED)
4. #76: Optimize database queries (CLOSED)
5. #45: Security audit findings (CAPTURED)"
```

## Error Handling Patterns

### Pattern 1: SQL Validation Error

```
User: "Delete all work items"

AI generates: DELETE FROM work_items

Backend returns: 
{ success: false, error: "UPDATE and DELETE statements must include a WHERE clause" }

AI Response:
"I can't delete all work items as that would be unsafe. 
If you want to delete a specific work item, please tell me which one."
```

### Pattern 2: Database Error

```
User: "Create work item with category 999"

AI generates: INSERT INTO work_items (category_id, ...) VALUES (999, ...)

Backend returns: 
{ success: false, error: "Foreign key constraint violation" }

AI Response:
"I couldn't create the work item because category 999 doesn't exist. 
Let me check available categories for you."
```

### Pattern 3: Blocked Keyword

```
User: "Drop the work_items table"

AI generates: DROP TABLE work_items

Backend returns: 
{ success: false, error: "Blocked keyword detected: DROP" }

AI Response:
"I can't perform that operation as it would be destructive. 
I can only help with creating, reading, updating, or deleting individual work items."
```

## Best Practices for AI

1. **Always call fetch_schema first** before generating SQL
2. **Use conversation context** to resolve "this", "it", "that"
3. **Ask for clarification** when intent is ambiguous
4. **Explain actions clearly** after execution
5. **Handle errors gracefully** and guide users
6. **Respect scope boundaries** - never try to bypass them
7. **Prefer UPDATE over CREATE** for follow-ups
8. **Include WHERE clauses** on all UPDATE/DELETE
9. **Set parent_id correctly** when creating children
10. **Never fabricate success** - always check backend response

## Frontend Responsibilities

1. **Generate correct threadId** based on context
2. **Pass threadId** in all execute_sql requests
3. **Inject variables** for work-item scoped chats
4. **Handle navigation** after work item creation
5. **Display errors** from backend clearly
6. **Maintain conversation UI** per threadId
7. **Clear context** when switching scopes

## Backend Guarantees

1. **Validates all SQL** before execution
2. **Enforces scope boundaries** via threadId
3. **Logs all mutations** for event system
4. **Returns clear errors** for violations
5. **Never executes unsafe operations**
6. **Maintains data integrity**
7. **Provides deterministic responses**
