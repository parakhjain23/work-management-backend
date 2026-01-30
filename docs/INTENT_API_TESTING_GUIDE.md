# Intent API Testing Guide

## Quick Start

### Prerequisites
1. Backend server running: `npm run dev`
2. Database seeded with at least one category (id: 1)
3. Postman or curl installed

---

## Test Plan Overview

This guide tests the new intent-based architecture:
- ✅ SQL executor blocks mutations
- ✅ Intent API handles all mutations
- ✅ Event dispatcher triggers RAG and system prompts
- ✅ Scope validation works
- ✅ Error handling is correct

---

# Phase 1: Verify SQL Executor Restriction

## Test 1.1: SELECT Query (Should Work)

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/execute-sql`  
**Body:**
```json
{
  "sql": "SELECT id, title, status FROM work_items LIMIT 5"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "type": "SELECT",
  "data": [...]
}
```

**✅ Verify:** Query executes successfully

---

## Test 1.2: INSERT Query (Should Fail)

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/execute-sql`  
**Body:**
```json
{
  "sql": "INSERT INTO work_items (category_id, title) VALUES (1, 'Test')"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Mutation SQL is not allowed. Use /ai/intent API for INSERT, UPDATE, DELETE operations."
}
```

**✅ Verify:** INSERT is blocked

---

## Test 1.3: UPDATE Query (Should Fail)

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/execute-sql`  
**Body:**
```json
{
  "sql": "UPDATE work_items SET status = 'CLOSED' WHERE id = 1"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Mutation SQL is not allowed. Use /ai/intent API for INSERT, UPDATE, DELETE operations."
}
```

**✅ Verify:** UPDATE is blocked

---

## Test 1.4: DELETE Query (Should Fail)

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/execute-sql`  
**Body:**
```json
{
  "sql": "DELETE FROM work_items WHERE id = 1"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Mutation SQL is not allowed. Use /ai/intent API for INSERT, UPDATE, DELETE operations."
}
```

**✅ Verify:** DELETE is blocked

---

# Phase 2: Create Work Item via Intent

## Test 2.1: Create Work Item (Basic)

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
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

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "result": {
    "type": "work_item_created",
    "id": "1",
    "data": {
      "id": "1",
      "categoryId": "1",
      "title": "Fix payment gateway timeout",
      "description": "Payment processing fails after 30 seconds",
      "status": "CAPTURED",
      "priority": "HIGH",
      "category": {
        "id": "1",
        "name": "...",
        "keyName": "..."
      }
    }
  }
}
```

**✅ Verify:**
- Work item created
- Status defaults to CAPTURED
- Category relationship included
- Check server logs for event dispatch

**✅ Save:** Copy the work item `id` for next tests

---

## Test 2.2: Create Work Item (Missing Title)

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "create_work_item",
  "payload": {
    "description": "No title provided"
  },
  "threadId": "org:1:global"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "title is required"
}
```

**✅ Verify:** Validation works

---

## Test 2.3: Create Work Item (All Fields)

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "create_work_item",
  "payload": {
    "title": "Database connection leak",
    "description": "Connections not being released properly",
    "priority": "URGENT",
    "status": "CAPTURED",
    "category_id": 1,
    "due_date": "2024-02-15",
    "start_date": "2024-01-30"
  },
  "threadId": "org:1:global"
}
```

**Expected Response:** `200 OK`

**✅ Verify:** All fields are set correctly

---

# Phase 3: Update Work Item via Intent

## Test 3.1: Update Work Item Status

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "update_work_item",
  "payload": {
    "work_item_id": 1,
    "fields": {
      "status": "IN_PROGRESS"
    }
  },
  "threadId": "workItem:1"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "result": {
    "type": "work_item_updated",
    "id": "1",
    "data": {
      "id": "1",
      "status": "IN_PROGRESS",
      ...
    }
  }
}
```

**✅ Verify:**
- Status changed to IN_PROGRESS
- Work item log created
- Event dispatched with changed_fields: ['status']

---

## Test 3.2: Update Multiple Fields

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "update_work_item",
  "payload": {
    "work_item_id": 1,
    "fields": {
      "status": "IN_REVIEW",
      "priority": "URGENT",
      "description": "Updated description with more details"
    }
  },
  "threadId": "workItem:1"
}
```

**Expected Response:** `200 OK`

**✅ Verify:**
- All fields updated
- Work item log shows all changes
- Event dispatched with changed_fields: ['status', 'priority', 'description']

---

## Test 3.3: Update Work Item Status (Convenience Intent)

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "update_work_item_status",
  "payload": {
    "work_item_id": 1,
    "status": "CLOSED"
  },
  "threadId": "workItem:1"
}
```

**Expected Response:** `200 OK`

**✅ Verify:** Status changed to CLOSED

---

# Phase 4: Custom Field Values via Intent

## Test 4.1: Update Custom Field Values

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "update_custom_field_value",
  "payload": {
    "work_item_id": 1,
    "values": {
      "root_cause": "Database connection pool exhaustion",
      "customer_impact": "High",
      "estimated_hours": 8,
      "is_critical": true
    }
  },
  "threadId": "workItem:1"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "result": {
    "type": "custom_field_values_updated",
    "id": "1",
    "data": {
      "root_cause": "Database connection pool exhaustion",
      "customer_impact": "High",
      "estimated_hours": 8,
      "is_critical": true
    }
  }
}
```

**✅ Verify:**
- All custom fields updated
- Type validation passed
- Work item log created
- Event dispatched

---

## Test 4.2: Type Validation Error

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "update_custom_field_value",
  "payload": {
    "work_item_id": 1,
    "values": {
      "estimated_hours": "eight"
    }
  },
  "threadId": "workItem:1"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Field \"estimated_hours\" expects a number"
}
```

**✅ Verify:** Type validation works

---

# Phase 5: Child Work Items via Intent

## Test 5.1: Add Child Work Item

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "add_child_work_item",
  "payload": {
    "parent_id": 1,
    "title": "Increase database connection pool size",
    "description": "Update configuration to allow 100 max connections",
    "priority": "HIGH"
  },
  "threadId": "workItem:1"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "result": {
    "type": "child_work_item_created",
    "id": "2",
    "data": {
      "id": "2",
      "parentId": "1",
      "categoryId": "1",
      "title": "Increase database connection pool size",
      ...
    }
  }
}
```

**✅ Verify:**
- Child created with parentId = 1
- Child inherits categoryId from parent
- Event dispatched

---

# Phase 6: Category Management via Intent

## Test 6.1: Create Category

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
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

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "result": {
    "type": "category_created",
    "id": "2",
    "data": {
      "id": "2",
      "keyName": "features",
      "name": "Feature Requests",
      "externalTool": "linear",
      ...
    }
  }
}
```

**✅ Verify:** Category created

---

## Test 6.2: Update Category

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "update_category",
  "payload": {
    "category_id": 2,
    "fields": {
      "name": "Product Features"
    }
  },
  "threadId": "org:1:global"
}
```

**Expected Response:** `200 OK`

**✅ Verify:** Category name updated

---

# Phase 7: Scope Validation

## Test 7.1: Scope Violation (Wrong Work Item)

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "update_work_item",
  "payload": {
    "work_item_id": 1,
    "fields": {
      "status": "CLOSED"
    }
  },
  "threadId": "workItem:999"
}
```

**Expected Response:** `403 Forbidden`
```json
{
  "success": false,
  "error": "Scope violation: work_item_id does not match threadId"
}
```

**✅ Verify:** Scope enforcement works

---

## Test 7.2: Global Scope Allows Any Work Item

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "update_work_item",
  "payload": {
    "work_item_id": 1,
    "fields": {
      "priority": "LOW"
    }
  },
  "threadId": "org:1:global"
}
```

**Expected Response:** `200 OK`

**✅ Verify:** Global scope bypasses work item restrictions

---

# Phase 8: Error Handling

## Test 8.1: Invalid Intent Type

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "invalid_intent",
  "payload": {},
  "threadId": "org:1:global"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Invalid intent type: invalid_intent"
}
```

---

## Test 8.2: Missing Required Field (intent)

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "payload": {
    "title": "Test"
  },
  "threadId": "org:1:global"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "intent is required"
}
```

---

## Test 8.3: Missing Required Field (threadId)

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "create_work_item",
  "payload": {
    "title": "Test"
  }
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "threadId is required"
}
```

---

## Test 8.4: Work Item Not Found

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "update_work_item",
  "payload": {
    "work_item_id": 999999,
    "fields": {
      "status": "CLOSED"
    }
  },
  "threadId": "org:1:global"
}
```

**Expected Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "Work item not found"
}
```

---

# Phase 9: Event System Verification

## Test 9.1: Check Server Logs

After creating/updating work items, check server logs for:

```
[Intent API] Processing intent: create_work_item for org: 1, thread: org:1:global
[Event Dispatcher] Event: {"entity":"work_item","action":"create","entity_id":"1",...}
[RAG Producer] Indexing work item 1
[System Prompt Runner] Would process event: {...}
[System Prompt Runner] ✓ Event logged (no execution in POC)
```

**✅ Verify:**
- Intent processed
- Event dispatched
- RAG Producer triggered
- System Prompt Runner logged

---

## Test 9.2: Check Work Item Logs

**Method:** `GET`  
**URL:** `http://localhost:3000/work-items/1/logs`

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "3",
      "logType": "field_update",
      "message": "Custom fields updated: ...",
      "createdAt": "..."
    },
    {
      "id": "2",
      "logType": "field_update",
      "message": "Status changed from CAPTURED to IN_PROGRESS",
      "createdAt": "..."
    },
    {
      "id": "1",
      "logType": "field_update",
      "message": "Work item created",
      "createdAt": "..."
    }
  ]
}
```

**✅ Verify:** All mutations are logged

---

# Phase 10: Delete Operations

## Test 10.1: Delete Work Item

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/intent`  
**Body:**
```json
{
  "intent": "delete_work_item",
  "payload": {
    "work_item_id": 2
  },
  "threadId": "org:1:global"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "result": {
    "type": "work_item_deleted",
    "id": "2"
  }
}
```

**✅ Verify:**
- Work item deleted
- Event dispatched
- RAG Producer removes from index

---

# Complete Test Checklist

## ✅ SQL Executor Restriction
- [ ] SELECT queries work
- [ ] INSERT queries blocked
- [ ] UPDATE queries blocked
- [ ] DELETE queries blocked

## ✅ Create Work Item
- [ ] Basic creation works
- [ ] Validation (missing title) works
- [ ] All fields can be set
- [ ] Events dispatched

## ✅ Update Work Item
- [ ] Single field update works
- [ ] Multiple fields update works
- [ ] Convenience intent (status) works
- [ ] Events dispatched

## ✅ Custom Field Values
- [ ] Update values works
- [ ] Type validation works
- [ ] Events dispatched

## ✅ Child Work Items
- [ ] Add child works
- [ ] Category inheritance works
- [ ] Events dispatched

## ✅ Categories
- [ ] Create category works
- [ ] Update category works
- [ ] Events dispatched

## ✅ Scope Validation
- [ ] Scope violation returns 403
- [ ] Global scope allows all
- [ ] WorkItem scope enforced

## ✅ Error Handling
- [ ] Invalid intent type
- [ ] Missing required fields
- [ ] Not found errors
- [ ] Conflict errors

## ✅ Event System
- [ ] Events logged in server
- [ ] RAG Producer triggered
- [ ] System Prompt Runner logged
- [ ] Work item logs created

## ✅ Delete Operations
- [ ] Delete work item works
- [ ] Events dispatched

---

# Server Log Monitoring

Watch for these log patterns:

```bash
# Intent processing
[Intent API] Processing intent: create_work_item for org: 1, thread: org:1:global

# Event dispatch
[Event Dispatcher] Event: {"entity":"work_item","action":"create","entity_id":"1"}

# RAG Producer
[RAG Producer] Indexing work item 1
[RAG] Added resource: workItem:1 to collection collection_abc123

# System Prompt Runner
[System Prompt Runner] Would process event: {...}
[System Prompt Runner] Would trigger: status_change prompts
[System Prompt Runner] ✓ Event logged (no execution in POC)
```

---

# Success Criteria

This phase is DONE when:

- ✅ AI can create/update work items WITHOUT SQL
- ✅ SQL executor rejects mutation SQL
- ✅ CRUD APIs remain intact for UI
- ✅ Event hooks fire on every mutation
- ✅ RAG + system prompts have clean hook points
- ✅ Architecture is future-proof

---

# Next Steps

After testing:

1. **Configure GTWY Chatbot:**
   - Add `reporting_sql` tool → POST /ai/execute-sql
   - Add `intent_executor` tool → POST /ai/intent

2. **Test with AI:**
   - "Create a work item for fixing payment timeout"
   - "Update work item 1 status to in progress"
   - "Add a custom field value for severity"

3. **Monitor:**
   - Check event logs
   - Verify RAG indexing
   - Confirm system prompt logging

---

**Testing Guide Version**: 1.0  
**Last Updated**: January 29, 2024  
**Status**: Ready for Testing 🚀
