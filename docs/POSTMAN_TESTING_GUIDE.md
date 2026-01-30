# Postman Testing Guide - Complete Backend

## Prerequisites

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Server should be running on `http://localhost:3000`

2. **Database Setup**
   - Ensure PostgreSQL is running
   - Database is seeded with at least one organization (id: 1)

3. **Postman Setup**
   - Install Postman Desktop or use Postman Web
   - Create a new Collection: "Work Management Backend"

---

## Base Configuration

### Environment Variables (Optional)
Create a Postman environment with:
```
BASE_URL = http://localhost:3000
```

---

## Testing Plan - Step by Step

Follow this order to test all features systematically:

---

# Phase 1: Categories Management

## 1.1 Create Category - "Bug Reports"

**Method:** `POST`  
**URL:** `http://localhost:3000/categories`  
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "keyName": "bugs",
  "name": "Bug Reports",
  "externalTool": "jira"
}
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "1",
    "orgId": "1",
    "keyName": "bugs",
    "name": "Bug Reports",
    "externalTool": "jira",
    "createdBy": "1",
    "updatedBy": "1",
    "createdAt": "2024-01-29T...",
    "updatedAt": "2024-01-29T..."
  }
}
```

**✅ Save:** Copy the `id` value (e.g., "1") - you'll need it!

---

## 1.2 Create Category - "Feature Requests"

**Method:** `POST`  
**URL:** `http://localhost:3000/categories`  
**Body:**
```json
{
  "keyName": "features",
  "name": "Feature Requests",
  "externalTool": "linear"
}
```

**Expected Response:** `201 Created`

---

## 1.3 Get All Categories

**Method:** `GET`  
**URL:** `http://localhost:3000/categories`  
**Headers:** None needed

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "keyName": "bugs",
      "name": "Bug Reports",
      ...
    },
    {
      "id": "2",
      "keyName": "features",
      "name": "Feature Requests",
      ...
    }
  ]
}
```

**✅ Verify:** You should see both categories

---

## 1.4 Get Category by ID

**Method:** `GET`  
**URL:** `http://localhost:3000/categories/1`

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "1",
    "keyName": "bugs",
    "name": "Bug Reports",
    ...
  }
}
```

---

## 1.5 Update Category

**Method:** `PATCH`  
**URL:** `http://localhost:3000/categories/1`  
**Body:**
```json
{
  "name": "Critical Bugs"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Critical Bugs",
    ...
  }
}
```

**✅ Verify:** Name changed from "Bug Reports" to "Critical Bugs"

---

## 1.6 Test Error - Duplicate Key Name

**Method:** `POST`  
**URL:** `http://localhost:3000/categories`  
**Body:**
```json
{
  "keyName": "bugs",
  "name": "Duplicate Bugs"
}
```

**Expected Response:** `409 Conflict`
```json
{
  "success": false,
  "error": "Category with this key_name already exists"
}
```

**✅ Verify:** Error is returned, no category created

---

# Phase 2: Custom Fields Metadata

## 2.1 Create Custom Field - "Root Cause" (Text)

**Method:** `POST`  
**URL:** `http://localhost:3000/categories/1/custom-fields`  
**Body:**
```json
{
  "name": "Root Cause",
  "keyName": "root_cause",
  "dataType": "text",
  "description": "What caused this issue",
  "meta": {
    "placeholder": "Enter root cause analysis",
    "required": true
  }
}
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "1",
    "categoryId": "1",
    "keyName": "root_cause",
    "dataType": "text",
    ...
  }
}
```

**✅ Save:** Copy the field `id`

---

## 2.2 Create Custom Field - "Customer Impact" (Text with Enums)

**Method:** `POST`  
**URL:** `http://localhost:3000/categories/1/custom-fields`  
**Body:**
```json
{
  "name": "Customer Impact",
  "keyName": "customer_impact",
  "dataType": "text",
  "description": "Impact level on customers",
  "enums": "Low,Medium,High,Critical",
  "meta": {
    "type": "select"
  }
}
```

**Expected Response:** `201 Created`

---

## 2.3 Create Custom Field - "Estimated Hours" (Number)

**Method:** `POST`  
**URL:** `http://localhost:3000/categories/1/custom-fields`  
**Body:**
```json
{
  "name": "Estimated Hours",
  "keyName": "estimated_hours",
  "dataType": "number",
  "description": "Estimated time to fix in hours"
}
```

**Expected Response:** `201 Created`

---

## 2.4 Create Custom Field - "Is Critical" (Boolean)

**Method:** `POST`  
**URL:** `http://localhost:3000/categories/1/custom-fields`  
**Body:**
```json
{
  "name": "Is Critical",
  "keyName": "is_critical",
  "dataType": "boolean",
  "description": "Is this a critical issue?"
}
```

**Expected Response:** `201 Created`

---

## 2.5 Create Custom Field - "Metadata" (JSON)

**Method:** `POST`  
**URL:** `http://localhost:3000/categories/1/custom-fields`  
**Body:**
```json
{
  "name": "Additional Metadata",
  "keyName": "metadata",
  "dataType": "json",
  "description": "Additional structured data"
}
```

**Expected Response:** `201 Created`

---

## 2.6 Get All Custom Fields for Category

**Method:** `GET`  
**URL:** `http://localhost:3000/categories/1/custom-fields`

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "keyName": "root_cause",
      "dataType": "text",
      ...
    },
    {
      "id": "2",
      "keyName": "customer_impact",
      "dataType": "text",
      "enums": "Low,Medium,High,Critical",
      ...
    },
    ...
  ]
}
```

**✅ Verify:** You should see all 5 custom fields

---

## 2.7 Update Custom Field

**Method:** `PATCH`  
**URL:** `http://localhost:3000/custom-fields/1`  
**Body:**
```json
{
  "name": "Root Cause Analysis",
  "description": "Detailed root cause analysis with timeline"
}
```

**Expected Response:** `200 OK`

---

# Phase 3: Work Items

## 3.1 Create Work Item - "Payment Gateway Timeout"

**Method:** `POST`  
**URL:** `http://localhost:3000/work-items`  
**Body:**
```json
{
  "categoryId": 1,
  "title": "Payment gateway timeout",
  "description": "Payment processing fails after 30 seconds. Users are unable to complete checkout.",
  "priority": "HIGH",
  "status": "CAPTURED",
  "dueDate": "2024-02-15"
}
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "1",
    "categoryId": "1",
    "title": "Payment gateway timeout",
    "status": "CAPTURED",
    "priority": "HIGH",
    "category": {
      "id": "1",
      "name": "Critical Bugs",
      "keyName": "bugs"
    },
    ...
  }
}
```

**✅ Save:** Copy the work item `id` (e.g., "1")

---

## 3.2 Create Work Item - "Database Connection Leak"

**Method:** `POST`  
**URL:** `http://localhost:3000/work-items`  
**Body:**
```json
{
  "categoryId": 1,
  "title": "Database connection leak",
  "description": "Connections not being released properly",
  "priority": "URGENT",
  "status": "CAPTURED"
}
```

**Expected Response:** `201 Created`

**✅ Save:** Copy this work item `id` too

---

## 3.3 Get All Work Items

**Method:** `GET`  
**URL:** `http://localhost:3000/work-items`

**Expected Response:** `200 OK` with array of work items

---

## 3.4 Get Work Items by Category

**Method:** `GET`  
**URL:** `http://localhost:3000/categories/1/work-items`

**Expected Response:** `200 OK` with work items in category 1

---

## 3.5 Get Work Items with Filters

**Method:** `GET`  
**URL:** `http://localhost:3000/work-items?status=CAPTURED&priority=HIGH&limit=10`

**Expected Response:** `200 OK` with filtered results

---

## 3.6 Get Work Item by ID

**Method:** `GET`  
**URL:** `http://localhost:3000/work-items/1`

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "1",
    "title": "Payment gateway timeout",
    "description": "...",
    "status": "CAPTURED",
    "priority": "HIGH",
    "category": {...},
    "parent": null
  }
}
```

---

## 3.7 Update Work Item - Change Status

**Method:** `PATCH`  
**URL:** `http://localhost:3000/work-items/1`  
**Body:**
```json
{
  "status": "IN_PROGRESS",
  "priority": "URGENT"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "1",
    "status": "IN_PROGRESS",
    "priority": "URGENT",
    ...
  }
}
```

**✅ Verify:** Status changed to IN_PROGRESS

---

# Phase 4: Custom Field Values

## 4.1 Set Custom Field Values

**Method:** `PATCH`  
**URL:** `http://localhost:3000/work-items/1/custom-fields`  
**Body:**
```json
{
  "root_cause": "Database connection pool exhaustion due to unclosed connections",
  "customer_impact": "High",
  "estimated_hours": 8,
  "is_critical": true,
  "metadata": {
    "affected_users": 1500,
    "regions": ["US", "EU", "APAC"],
    "first_reported": "2024-01-28T10:00:00Z"
  }
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "root_cause": "Database connection pool exhaustion due to unclosed connections",
    "customer_impact": "High",
    "estimated_hours": 8,
    "is_critical": true,
    "metadata": {
      "affected_users": 1500,
      "regions": ["US", "EU", "APAC"],
      "first_reported": "2024-01-28T10:00:00Z"
    }
  }
}
```

**✅ Verify:** All custom fields are set

---

## 4.2 Get Custom Field Values

**Method:** `GET`  
**URL:** `http://localhost:3000/work-items/1/custom-fields`

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "root_cause": "Database connection pool exhaustion due to unclosed connections",
    "customer_impact": "High",
    "estimated_hours": 8,
    "is_critical": true,
    "metadata": {...}
  }
}
```

---

## 4.3 Update Custom Field Values (UPSERT)

**Method:** `PATCH`  
**URL:** `http://localhost:3000/work-items/1/custom-fields`  
**Body:**
```json
{
  "estimated_hours": 12,
  "customer_impact": "Critical"
}
```

**Expected Response:** `200 OK` with updated values

**✅ Verify:** Only specified fields are updated, others remain unchanged

---

## 4.4 Test Type Validation Error

**Method:** `PATCH`  
**URL:** `http://localhost:3000/work-items/1/custom-fields`  
**Body:**
```json
{
  "estimated_hours": "twelve"
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

# Phase 5: Work Item Logs

## 5.1 Get Work Item Logs

**Method:** `GET`  
**URL:** `http://localhost:3000/work-items/1/logs`

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "4",
      "workItemId": "1",
      "logType": "field_update",
      "message": "Custom fields updated: Estimated Hours updated to 12, Customer Impact updated to Critical",
      "createdAt": "2024-01-29T..."
    },
    {
      "id": "3",
      "workItemId": "1",
      "logType": "field_update",
      "message": "Custom fields updated: Root Cause updated to ..., Customer Impact updated to High, ...",
      "createdAt": "2024-01-29T..."
    },
    {
      "id": "2",
      "workItemId": "1",
      "logType": "field_update",
      "message": "Status changed from CAPTURED to IN_PROGRESS; Priority changed from HIGH to URGENT",
      "createdAt": "2024-01-29T..."
    },
    {
      "id": "1",
      "workItemId": "1",
      "logType": "field_update",
      "message": "Work item created",
      "createdAt": "2024-01-29T..."
    }
  ]
}
```

**✅ Verify:** 
- Logs are ordered newest first
- All mutations are logged
- Messages are descriptive

---

# Phase 6: Child Work Items

## 6.1 Create Child Work Item

**Method:** `POST`  
**URL:** `http://localhost:3000/work-items/1/children`  
**Body:**
```json
{
  "title": "Increase database connection pool size",
  "description": "Update configuration to allow 100 max connections",
  "priority": "HIGH"
}
```

**Expected Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "3",
    "parentId": "1",
    "categoryId": "1",
    "title": "Increase database connection pool size",
    "status": "CAPTURED",
    "priority": "HIGH",
    ...
  }
}
```

**✅ Verify:** 
- Child has `parentId` = "1"
- Child inherits `categoryId` from parent

---

## 6.2 Create Another Child

**Method:** `POST`  
**URL:** `http://localhost:3000/work-items/1/children`  
**Body:**
```json
{
  "title": "Add connection timeout monitoring",
  "description": "Implement alerts for connection pool exhaustion",
  "priority": "MEDIUM"
}
```

**Expected Response:** `201 Created`

---

## 6.3 Get Children of Work Item

**Method:** `GET`  
**URL:** `http://localhost:3000/work-items/1/children`

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "3",
      "parentId": "1",
      "title": "Increase database connection pool size",
      ...
    },
    {
      "id": "4",
      "parentId": "1",
      "title": "Add connection timeout monitoring",
      ...
    }
  ]
}
```

**✅ Verify:** Both children are returned

---

# Phase 7: AI Endpoints

## 7.1 Get Database Schema

**Method:** `GET`  
**URL:** `http://localhost:3000/ai/schema`

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "schema": {
    "organizations": {
      "columns": ["id", "name", "created_at", "updated_at"]
    },
    "categories": {
      "columns": ["id", "org_id", "key_name", "name", ...]
    },
    "work_items": {
      "columns": ["id", "category_id", "title", "description", ...]
    },
    ...
  }
}
```

**✅ Verify:** All tables and columns are listed

---

## 7.2 Execute SQL - SELECT Query

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/execute-sql`  
**Body:**
```json
{
  "sql": "SELECT id, title, status, priority FROM work_items WHERE status = 'IN_PROGRESS' LIMIT 5"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "type": "SELECT",
  "data": [
    {
      "id": "1",
      "title": "Payment gateway timeout",
      "status": "IN_PROGRESS",
      "priority": "URGENT"
    }
  ],
  "rowCount": 1
}
```

**✅ Verify:** Query executes and returns data

---

## 7.3 Execute SQL - INSERT Query

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/execute-sql`  
**Body:**
```json
{
  "sql": "INSERT INTO work_items (category_id, title, description, status, priority) VALUES (1, 'API rate limiting issue', 'Users hitting rate limits', 'CAPTURED', 'MEDIUM')"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "type": "MUTATION",
  "rowsAffected": 1
}
```

**✅ Verify:** 
- Work item is created
- Check server logs for event logging
- RAG Producer should be triggered

---

## 7.4 Test SQL Validation - Blocked Keyword

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/execute-sql`  
**Body:**
```json
{
  "sql": "DROP TABLE work_items"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "SQL contains blocked keyword: DROP"
}
```

**✅ Verify:** Dangerous SQL is blocked

---

## 7.5 Test SQL Validation - Non-whitelisted Table

**Method:** `POST`  
**URL:** `http://localhost:3000/ai/execute-sql`  
**Body:**
```json
{
  "sql": "SELECT * FROM users"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "SQL references non-whitelisted table: users"
}
```

**✅ Verify:** Only whitelisted tables are accessible

---

# Phase 8: RAG Search

## 8.1 Search Work Items - Payment Issues

**Method:** `POST`  
**URL:** `http://localhost:3000/rag/search`  
**Body:**
```json
{
  "query": "payment gateway timeout database connection",
  "limit": 5,
  "minScore": 0.75
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "work_item_ids": [1, 5, 3]
}
```

**✅ Verify:** 
- Returns work item IDs
- Most relevant items first
- Check if work item 1 (payment gateway) is in results

**Note:** RAG search requires:
- Hippocampus API key configured
- Work items to be indexed (happens automatically on create/update)

---

## 8.2 Search with Different Query

**Method:** `POST`  
**URL:** `http://localhost:3000/rag/search`  
**Body:**
```json
{
  "query": "critical bugs affecting customers",
  "limit": 3,
  "minScore": 0.7
}
```

**Expected Response:** `200 OK` with relevant work item IDs

---

# Phase 9: Chatbot Integration

## 9.1 Get Chatbot Embed Token

**Method:** `GET`  
**URL:** `http://localhost:3000/chatbot/embed-token`

**Expected Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdfaWQiOjU4ODQ0LCJ2YXJpYWJsZXMiOnsib3JnX2lkIjoiMSIsInVzZXJfaWQiOiIxIn0sImlhdCI6MTcwNjUyMDAwMCwiZXhwIjoxNzA2NTIzNjAwfQ..."
}
```

**✅ Verify:** JWT token is returned

---

# Phase 10: Delete Operations

## 10.1 Delete Work Item

**Method:** `DELETE`  
**URL:** `http://localhost:3000/work-items/2`

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Work item deleted successfully"
  }
}
```

**✅ Verify:** Work item is deleted

---

## 10.2 Test Delete Category with Work Items

**Method:** `DELETE`  
**URL:** `http://localhost:3000/categories/1`

**Expected Response:** `409 Conflict`
```json
{
  "success": false,
  "error": "Cannot delete category with existing work items"
}
```

**✅ Verify:** Cannot delete category with work items

---

## 10.3 Delete Custom Field

**Method:** `DELETE`  
**URL:** `http://localhost:3000/custom-fields/5`

**Expected Response:** `200 OK`

---

# Phase 11: Health Check

## 11.1 Health Endpoint

**Method:** `GET`  
**URL:** `http://localhost:3000/health`

**Expected Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2024-01-29T..."
}
```

---

# Complete Test Checklist

## ✅ Categories
- [ ] Create category
- [ ] Get all categories
- [ ] Get category by ID
- [ ] Update category
- [ ] Delete category
- [ ] Test duplicate key_name error

## ✅ Custom Fields Metadata
- [ ] Create text field
- [ ] Create number field
- [ ] Create boolean field
- [ ] Create json field
- [ ] Create field with enums
- [ ] Get all fields for category
- [ ] Update field metadata
- [ ] Delete field

## ✅ Work Items
- [ ] Create work item
- [ ] Get all work items
- [ ] Get work items by category
- [ ] Get work item by ID
- [ ] Update work item
- [ ] Delete work item
- [ ] Filter by status
- [ ] Filter by priority
- [ ] Pagination

## ✅ Custom Field Values
- [ ] Set custom field values
- [ ] Get custom field values
- [ ] Update custom field values (UPSERT)
- [ ] Test type validation

## ✅ Work Item Logs
- [ ] Get logs for work item
- [ ] Verify automatic logging

## ✅ Child Work Items
- [ ] Create child work item
- [ ] Get children
- [ ] Verify category inheritance

## ✅ AI Endpoints
- [ ] Get database schema
- [ ] Execute SELECT query
- [ ] Execute INSERT query
- [ ] Test blocked keywords
- [ ] Test non-whitelisted tables

## ✅ RAG Search
- [ ] Search work items
- [ ] Test different queries
- [ ] Verify relevance

## ✅ Chatbot
- [ ] Get embed token

## ✅ Error Handling
- [ ] 400 - Bad Request
- [ ] 404 - Not Found
- [ ] 409 - Conflict
- [ ] 500 - Server Error

---

# Postman Collection Export

You can create a Postman collection with all these requests. Here's how:

1. **Create Collection**: "Work Management Backend"
2. **Create Folders**:
   - Categories
   - Custom Fields
   - Work Items
   - Custom Field Values
   - Work Item Logs
   - Child Work Items
   - AI Endpoints
   - RAG Search
   - Chatbot

3. **Add Requests**: Copy each request from this guide

4. **Use Variables**: 
   - `{{BASE_URL}}` = `http://localhost:3000`
   - `{{category_id}}` = Save from create response
   - `{{work_item_id}}` = Save from create response
   - `{{field_id}}` = Save from create response

5. **Export Collection**: Share with team

---

# Monitoring During Tests

## Server Logs
Watch the terminal running `npm run dev`:
```
[2024-01-29T10:00:00.000Z] POST /categories - User: 1
[2024-01-29T10:00:01.000Z] POST /work-items - User: 1
[EVENT] {"entity_type":"work_item","action":"CREATE","entity_id":1}
[RAG Producer] Indexing work item 1
```

## Database Verification
Connect to PostgreSQL and verify:
```sql
SELECT * FROM categories;
SELECT * FROM work_items;
SELECT * FROM custom_field_values;
SELECT * FROM work_item_logs ORDER BY created_at DESC;
```

---

# Troubleshooting

## Issue: "Category not found"
- Ensure category was created successfully
- Check category ID in URL matches created category

## Issue: "Custom field not found"
- Verify keyName matches exactly (case-sensitive)
- Check field was created for correct category

## Issue: RAG search returns empty
- Ensure Hippocampus API key is configured in `.env`
- Wait a few seconds after creating work items (indexing is async)
- Check server logs for RAG errors

## Issue: Type validation error
- Verify data type matches field definition
- Check JSON is properly formatted

## Issue: 500 Internal Server Error
- Check server logs for detailed error
- Verify database connection
- Ensure Prisma client is generated

---

# Next Steps After Testing

1. **Document Issues**: Note any bugs or unexpected behavior
2. **Performance Testing**: Test with larger datasets
3. **Load Testing**: Use Postman Runner for concurrent requests
4. **Frontend Integration**: Use these endpoints in frontend
5. **Authentication**: Replace mock auth with real auth

---

**Testing Guide Version**: 1.0  
**Last Updated**: January 29, 2024

Happy Testing! 🚀
