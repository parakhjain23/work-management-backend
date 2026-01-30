# Complete API Reference with Examples

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints use mock authentication. Every request automatically has:
```javascript
req.user = {
  id: 1,
  org_id: 1
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

---

# Categories API

## 1. Get All Categories

**Endpoint:** `GET /categories`

**Description:** Fetch all categories for the user's organization.

**Request:**
```bash
curl http://localhost:3000/categories
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "orgId": "1",
      "keyName": "bugs",
      "name": "Bug Reports",
      "externalTool": "jira",
      "createdBy": "1",
      "updatedBy": "1",
      "createdAt": "2024-01-29T10:00:00.000Z",
      "updatedAt": "2024-01-29T10:00:00.000Z"
    },
    {
      "id": "2",
      "orgId": "1",
      "keyName": "features",
      "name": "Feature Requests",
      "externalTool": null,
      "createdBy": "1",
      "updatedBy": "1",
      "createdAt": "2024-01-29T11:00:00.000Z",
      "updatedAt": "2024-01-29T11:00:00.000Z"
    }
  ]
}
```

---

## 2. Get Category by ID

**Endpoint:** `GET /categories/:categoryId`

**Description:** Fetch a single category by ID.

**Request:**
```bash
curl http://localhost:3000/categories/1
```

**Response:** `200 OK`
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
    "createdAt": "2024-01-29T10:00:00.000Z",
    "updatedAt": "2024-01-29T10:00:00.000Z"
  }
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "Category not found"
}
```

---

## 3. Create Category

**Endpoint:** `POST /categories`

**Description:** Create a new category.

**Request Body:**
```json
{
  "keyName": "features",
  "name": "Feature Requests",
  "externalTool": "linear"
}
```

**Request:**
```bash
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "features",
    "name": "Feature Requests",
    "externalTool": "linear"
  }'
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "2",
    "orgId": "1",
    "keyName": "features",
    "name": "Feature Requests",
    "externalTool": "linear",
    "createdBy": "1",
    "updatedBy": "1",
    "createdAt": "2024-01-29T11:00:00.000Z",
    "updatedAt": "2024-01-29T11:00:00.000Z"
  }
}
```

**Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "keyName and name are required"
}
```

**Error Response:** `409 Conflict`
```json
{
  "success": false,
  "error": "Category with this key_name already exists"
}
```

---

## 4. Update Category

**Endpoint:** `PATCH /categories/:categoryId`

**Description:** Update an existing category.

**Request Body:**
```json
{
  "name": "Critical Bugs",
  "externalTool": "jira"
}
```

**Request:**
```bash
curl -X PATCH http://localhost:3000/categories/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Critical Bugs",
    "externalTool": "jira"
  }'
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "1",
    "orgId": "1",
    "keyName": "bugs",
    "name": "Critical Bugs",
    "externalTool": "jira",
    "createdBy": "1",
    "updatedBy": "1",
    "createdAt": "2024-01-29T10:00:00.000Z",
    "updatedAt": "2024-01-29T12:00:00.000Z"
  }
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "Category not found"
}
```

---

## 5. Delete Category

**Endpoint:** `DELETE /categories/:categoryId`

**Description:** Delete a category.

**Request:**
```bash
curl -X DELETE http://localhost:3000/categories/1
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Category deleted successfully"
  }
}
```

**Error Response:** `409 Conflict`
```json
{
  "success": false,
  "error": "Cannot delete category with existing work items"
}
```

---

# Work Items API

## 6. Get All Work Items

**Endpoint:** `GET /work-items`

**Description:** Fetch all work items with optional filters.

**Query Parameters:**
- `categoryId` (optional) - Filter by category ID
- `status` (optional) - Filter by status
- `priority` (optional) - Filter by priority
- `limit` (optional) - Number of results (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Request:**
```bash
# All work items
curl http://localhost:3000/work-items

# With filters
curl "http://localhost:3000/work-items?categoryId=1&status=IN_PROGRESS&priority=HIGH&limit=10&offset=0"
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "42",
      "externalId": null,
      "categoryId": "1",
      "title": "Fix payment gateway timeout",
      "description": "Payment processing fails after 30 seconds",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "assigneeId": null,
      "createdBy": "1",
      "updatedBy": "1",
      "startDate": null,
      "dueDate": "2024-02-01",
      "parentId": null,
      "rootParentId": null,
      "docId": null,
      "createdAt": "2024-01-29T10:00:00.000Z",
      "updatedAt": "2024-01-29T10:30:00.000Z",
      "category": {
        "id": "1",
        "name": "Bug Reports",
        "keyName": "bugs"
      }
    }
  ]
}
```

---

## 7. Get Work Items by Category

**Endpoint:** `GET /categories/:categoryId/work-items`

**Description:** Fetch all work items in a specific category.

**Request:**
```bash
curl http://localhost:3000/categories/1/work-items
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "42",
      "categoryId": "1",
      "title": "Fix payment gateway timeout",
      "description": "Payment processing fails after 30 seconds",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "createdAt": "2024-01-29T10:00:00.000Z",
      "category": {
        "id": "1",
        "name": "Bug Reports",
        "keyName": "bugs"
      }
    },
    {
      "id": "43",
      "categoryId": "1",
      "title": "Database connection leak",
      "description": "Connections not being released",
      "status": "CAPTURED",
      "priority": "URGENT",
      "createdAt": "2024-01-29T11:00:00.000Z",
      "category": {
        "id": "1",
        "name": "Bug Reports",
        "keyName": "bugs"
      }
    }
  ]
}
```

---

## 8. Get Work Item by ID

**Endpoint:** `GET /work-items/:workItemId`

**Description:** Fetch a single work item by ID.

**Request:**
```bash
curl http://localhost:3000/work-items/42
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "42",
    "externalId": null,
    "categoryId": "1",
    "title": "Fix payment gateway timeout",
    "description": "Payment processing fails after 30 seconds",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "assigneeId": null,
    "createdBy": "1",
    "updatedBy": "1",
    "startDate": "2024-01-29",
    "dueDate": "2024-02-01",
    "parentId": null,
    "rootParentId": null,
    "docId": null,
    "createdAt": "2024-01-29T10:00:00.000Z",
    "updatedAt": "2024-01-29T10:30:00.000Z",
    "category": {
      "id": "1",
      "name": "Bug Reports",
      "keyName": "bugs"
    },
    "parent": null
  }
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "Work item not found"
}
```

---

## 9. Create Work Item

**Endpoint:** `POST /work-items`

**Description:** Create a new work item.

**Request Body:**
```json
{
  "categoryId": 1,
  "title": "Fix payment gateway timeout",
  "description": "Payment processing fails after 30 seconds",
  "status": "CAPTURED",
  "priority": "HIGH",
  "assigneeId": 5,
  "startDate": "2024-01-29",
  "dueDate": "2024-02-01",
  "parentId": null
}
```

**Request:**
```bash
curl -X POST http://localhost:3000/work-items \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": 1,
    "title": "Fix payment gateway timeout",
    "description": "Payment processing fails after 30 seconds",
    "priority": "HIGH",
    "dueDate": "2024-02-01"
  }'
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "42",
    "externalId": null,
    "categoryId": "1",
    "title": "Fix payment gateway timeout",
    "description": "Payment processing fails after 30 seconds",
    "status": "CAPTURED",
    "priority": "HIGH",
    "assigneeId": null,
    "createdBy": "1",
    "updatedBy": "1",
    "startDate": null,
    "dueDate": "2024-02-01T00:00:00.000Z",
    "parentId": null,
    "rootParentId": null,
    "docId": null,
    "createdAt": "2024-01-29T10:00:00.000Z",
    "updatedAt": "2024-01-29T10:00:00.000Z",
    "category": {
      "id": "1",
      "name": "Bug Reports",
      "keyName": "bugs"
    }
  }
}
```

**Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "categoryId and title are required"
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "Category not found"
}
```

**Note:** A log entry is automatically created with message "Work item created"

---

## 10. Update Work Item

**Endpoint:** `PATCH /work-items/:workItemId`

**Description:** Update an existing work item. Only allowed fields: title, description, status, priority, categoryId.

**Request Body:**
```json
{
  "title": "Fix critical payment gateway timeout",
  "description": "Updated description with more details",
  "status": "IN_PROGRESS",
  "priority": "URGENT",
  "categoryId": 1
}
```

**Request:**
```bash
curl -X PATCH http://localhost:3000/work-items/42 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS",
    "priority": "URGENT"
  }'
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "42",
    "categoryId": "1",
    "title": "Fix payment gateway timeout",
    "description": "Payment processing fails after 30 seconds",
    "status": "IN_PROGRESS",
    "priority": "URGENT",
    "assigneeId": null,
    "createdBy": "1",
    "updatedBy": "1",
    "startDate": null,
    "dueDate": "2024-02-01T00:00:00.000Z",
    "parentId": null,
    "rootParentId": null,
    "docId": null,
    "createdAt": "2024-01-29T10:00:00.000Z",
    "updatedAt": "2024-01-29T10:30:00.000Z",
    "category": {
      "id": "1",
      "name": "Bug Reports",
      "keyName": "bugs"
    }
  }
}
```

**Note:** A log entry is automatically created documenting the changes

---

## 11. Delete Work Item

**Endpoint:** `DELETE /work-items/:workItemId`

**Description:** Delete a work item.

**Request:**
```bash
curl -X DELETE http://localhost:3000/work-items/42
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Work item deleted successfully"
  }
}
```

---

## 12. Get Work Item Children

**Endpoint:** `GET /work-items/:workItemId/children`

**Description:** Fetch all child work items.

**Request:**
```bash
curl http://localhost:3000/work-items/42/children
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "43",
      "categoryId": "1",
      "title": "Increase connection pool size",
      "description": "Update database configuration",
      "status": "CAPTURED",
      "priority": "HIGH",
      "parentId": "42",
      "createdAt": "2024-01-29T10:15:00.000Z",
      "category": {
        "id": "1",
        "name": "Bug Reports",
        "keyName": "bugs"
      }
    },
    {
      "id": "44",
      "categoryId": "1",
      "title": "Add retry logic",
      "description": "Implement exponential backoff",
      "status": "CAPTURED",
      "priority": "MEDIUM",
      "parentId": "42",
      "createdAt": "2024-01-29T10:20:00.000Z",
      "category": {
        "id": "1",
        "name": "Bug Reports",
        "keyName": "bugs"
      }
    }
  ]
}
```

---

## 13. Create Child Work Item

**Endpoint:** `POST /work-items/:workItemId/children`

**Description:** Create a child work item. Child automatically inherits parent's category_id.

**Request Body:**
```json
{
  "title": "Increase connection pool size",
  "description": "Update database configuration",
  "status": "CAPTURED",
  "priority": "HIGH"
}
```

**Request:**
```bash
curl -X POST http://localhost:3000/work-items/42/children \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Increase connection pool size",
    "description": "Update database configuration",
    "priority": "HIGH"
  }'
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "43",
    "categoryId": "1",
    "title": "Increase connection pool size",
    "description": "Update database configuration",
    "status": "CAPTURED",
    "priority": "HIGH",
    "parentId": "42",
    "createdAt": "2024-01-29T10:15:00.000Z",
    "category": {
      "id": "1",
      "name": "Bug Reports",
      "keyName": "bugs"
    }
  }
}
```

---

# Custom Fields API

## 14. Get Custom Fields by Category

**Endpoint:** `GET /categories/:categoryId/custom-fields`

**Description:** Fetch all custom field metadata for a category.

**Request:**
```bash
curl http://localhost:3000/categories/1/custom-fields
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "orgId": "1",
      "categoryId": "1",
      "name": "Root Cause",
      "keyName": "root_cause",
      "dataType": "text",
      "enums": null,
      "description": "What caused this issue",
      "meta": {
        "placeholder": "Enter root cause analysis"
      },
      "createdBy": "1",
      "updatedBy": "1",
      "createdAt": "2024-01-29T10:00:00.000Z",
      "updatedAt": "2024-01-29T10:00:00.000Z"
    },
    {
      "id": "2",
      "orgId": "1",
      "categoryId": "1",
      "name": "Customer Impact",
      "keyName": "customer_impact",
      "dataType": "text",
      "enums": "Low,Medium,High,Critical",
      "description": "Impact level on customers",
      "meta": {
        "type": "select"
      },
      "createdBy": "1",
      "updatedBy": "1",
      "createdAt": "2024-01-29T10:05:00.000Z",
      "updatedAt": "2024-01-29T10:05:00.000Z"
    },
    {
      "id": "3",
      "orgId": "1",
      "categoryId": "1",
      "name": "Estimated Hours",
      "keyName": "estimated_hours",
      "dataType": "number",
      "enums": null,
      "description": "Estimated time to fix",
      "meta": null,
      "createdBy": "1",
      "updatedBy": "1",
      "createdAt": "2024-01-29T10:10:00.000Z",
      "updatedAt": "2024-01-29T10:10:00.000Z"
    }
  ]
}
```

---

## 15. Get Custom Field by ID

**Endpoint:** `GET /custom-fields/:fieldId`

**Description:** Fetch a single custom field metadata by ID.

**Request:**
```bash
curl http://localhost:3000/custom-fields/1
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "1",
    "orgId": "1",
    "categoryId": "1",
    "name": "Root Cause",
    "keyName": "root_cause",
    "dataType": "text",
    "enums": null,
    "description": "What caused this issue",
    "meta": {
      "placeholder": "Enter root cause analysis"
    },
    "createdBy": "1",
    "updatedBy": "1",
    "createdAt": "2024-01-29T10:00:00.000Z",
    "updatedAt": "2024-01-29T10:00:00.000Z"
  }
}
```

---

## 16. Create Custom Field

**Endpoint:** `POST /categories/:categoryId/custom-fields`

**Description:** Create a new custom field metadata.

**Request Body:**
```json
{
  "name": "Root Cause",
  "keyName": "root_cause",
  "dataType": "text",
  "description": "What caused this issue",
  "enums": null,
  "meta": {
    "placeholder": "Enter root cause analysis",
    "required": true
  }
}
```

**Data Types:**
- `number` - Numeric values
- `text` - String values
- `boolean` - True/false
- `json` - JSON objects

**Request:**
```bash
curl -X POST http://localhost:3000/categories/1/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Root Cause",
    "keyName": "root_cause",
    "dataType": "text",
    "description": "What caused this issue",
    "meta": {
      "placeholder": "Enter root cause analysis"
    }
  }'
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "1",
    "orgId": "1",
    "categoryId": "1",
    "name": "Root Cause",
    "keyName": "root_cause",
    "dataType": "text",
    "enums": null,
    "description": "What caused this issue",
    "meta": {
      "placeholder": "Enter root cause analysis"
    },
    "createdBy": "1",
    "updatedBy": "1",
    "createdAt": "2024-01-29T10:00:00.000Z",
    "updatedAt": "2024-01-29T10:00:00.000Z"
  }
}
```

**Example with Enums:**
```bash
curl -X POST http://localhost:3000/categories/1/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Impact",
    "keyName": "customer_impact",
    "dataType": "text",
    "description": "Impact level on customers",
    "enums": "Low,Medium,High,Critical",
    "meta": {
      "type": "select"
    }
  }'
```

**Error Response:** `409 Conflict`
```json
{
  "success": false,
  "error": "Custom field with this key_name already exists"
}
```

---

## 17. Update Custom Field

**Endpoint:** `PATCH /custom-fields/:fieldId`

**Description:** Update custom field metadata. **Note:** dataType is IMMUTABLE.

**Request Body:**
```json
{
  "name": "Root Cause Analysis",
  "description": "Detailed root cause analysis",
  "enums": "Low,Medium,High,Critical,Blocker",
  "meta": {
    "placeholder": "Enter detailed analysis",
    "required": true,
    "maxLength": 500
  }
}
```

**Request:**
```bash
curl -X PATCH http://localhost:3000/custom-fields/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Root Cause Analysis",
    "description": "Detailed root cause analysis"
  }'
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "1",
    "orgId": "1",
    "categoryId": "1",
    "name": "Root Cause Analysis",
    "keyName": "root_cause",
    "dataType": "text",
    "enums": null,
    "description": "Detailed root cause analysis",
    "meta": {
      "placeholder": "Enter root cause analysis"
    },
    "createdBy": "1",
    "updatedBy": "1",
    "createdAt": "2024-01-29T10:00:00.000Z",
    "updatedAt": "2024-01-29T11:00:00.000Z"
  }
}
```

---

## 18. Delete Custom Field

**Endpoint:** `DELETE /custom-fields/:fieldId`

**Description:** Delete custom field metadata.

**Request:**
```bash
curl -X DELETE http://localhost:3000/custom-fields/1
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Custom field deleted successfully"
  }
}
```

---

## 19. Get Work Item Custom Field Values

**Endpoint:** `GET /work-items/:workItemId/custom-fields`

**Description:** Fetch all custom field values for a work item.

**Request:**
```bash
curl http://localhost:3000/work-items/42/custom-fields
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "root_cause": "Database connection pool exhaustion",
    "customer_impact": "High",
    "estimated_hours": 8,
    "is_critical": true,
    "metadata": {
      "affected_users": 1500,
      "regions": ["US", "EU"]
    }
  }
}
```

**Empty Response (no custom fields set):**
```json
{
  "success": true,
  "data": {}
}
```

---

## 20. Update Work Item Custom Field Values

**Endpoint:** `PATCH /work-items/:workItemId/custom-fields`

**Description:** Update custom field values for a work item (UPSERT operation).

**Request Body:**
```json
{
  "root_cause": "Database connection pool exhaustion",
  "customer_impact": "High",
  "estimated_hours": 8,
  "is_critical": true,
  "metadata": {
    "affected_users": 1500,
    "regions": ["US", "EU"]
  }
}
```

**Request:**
```bash
curl -X PATCH http://localhost:3000/work-items/42/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "root_cause": "Database connection pool exhaustion",
    "customer_impact": "High",
    "estimated_hours": 8
  }'
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "root_cause": "Database connection pool exhaustion",
    "customer_impact": "High",
    "estimated_hours": 8
  }
}
```

**Type Validation Examples:**

**Valid:**
```json
{
  "estimated_hours": 8,           // number field
  "root_cause": "DB timeout",     // text field
  "is_critical": true,            // boolean field
  "metadata": {"key": "value"}    // json field
}
```

**Invalid (type mismatch):**
```json
{
  "estimated_hours": "eight"  // ❌ expects number
}
```

**Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "Field \"estimated_hours\" expects a number"
}
```

**Error Response:** `404 Not Found`
```json
{
  "success": false,
  "error": "Custom field \"unknown_field\" not found"
}
```

**Note:** A log entry is automatically created documenting the changes

---

# Work Item Logs API

## 21. Get Work Item Logs

**Endpoint:** `GET /work-items/:workItemId/logs`

**Description:** Fetch all logs for a work item (read-only). Ordered by newest first.

**Request:**
```bash
curl http://localhost:3000/work-items/42/logs
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "5",
      "workItemId": "42",
      "logType": "field_update",
      "oldValue": null,
      "newValue": null,
      "message": "Custom fields updated: Root Cause updated to Database connection pool exhaustion, Customer Impact updated to High, Estimated Hours updated to 8",
      "createdAt": "2024-01-29T10:45:00.000Z"
    },
    {
      "id": "4",
      "workItemId": "42",
      "logType": "field_update",
      "oldValue": null,
      "newValue": null,
      "message": "Status changed from CAPTURED to IN_PROGRESS; Priority changed from HIGH to URGENT",
      "createdAt": "2024-01-29T10:30:00.000Z"
    },
    {
      "id": "3",
      "workItemId": "42",
      "logType": "field_update",
      "oldValue": null,
      "newValue": null,
      "message": "Title changed from \"Fix payment bug\" to \"Fix payment gateway timeout\"",
      "createdAt": "2024-01-29T10:15:00.000Z"
    },
    {
      "id": "2",
      "workItemId": "42",
      "logType": "field_update",
      "oldValue": null,
      "newValue": null,
      "message": "Work item created",
      "createdAt": "2024-01-29T10:00:00.000Z"
    }
  ]
}
```

**Log Types:**
- `status_change` - Status changed
- `comment` - Comment added
- `sync` - External sync
- `ai_analysis` - AI analysis
- `field_update` - Field updated

---

# AI Endpoints

## 22. Get Database Schema

**Endpoint:** `GET /ai/schema`

**Description:** Get database schema for AI chatbot.

**Request:**
```bash
curl http://localhost:3000/ai/schema
```

**Response:** `200 OK`
```json
{
  "success": true,
  "schema": {
    "organizations": {
      "columns": ["id", "name", "created_at", "updated_at"]
    },
    "categories": {
      "columns": ["id", "org_id", "key_name", "name", "external_tool", "created_by", "updated_by", "created_at", "updated_at"]
    },
    "work_items": {
      "columns": ["id", "external_id", "category_id", "title", "description", "status", "priority", "assignee_id", "created_by", "updated_by", "start_date", "due_date", "parent_id", "root_parent_id", "doc_id", "created_at", "updated_at"]
    },
    "custom_field_meta_data": {
      "columns": ["id", "org_id", "category_id", "name", "key_name", "data_type", "enums", "description", "meta", "created_by", "updated_by", "created_at", "updated_at"]
    },
    "custom_field_values": {
      "columns": ["id", "work_item_id", "custom_field_meta_data_id", "value_number", "value_text", "value_boolean", "value_json", "calculated_by", "created_at", "updated_at"]
    },
    "work_item_logs": {
      "columns": ["id", "work_item_id", "log_type", "old_value", "new_value", "message", "created_at"]
    }
  }
}
```

---

## 23. Execute SQL

**Endpoint:** `POST /ai/execute-sql`

**Description:** Execute SQL query (AI chatbot only).

**Request Body:**
```json
{
  "sql": "SELECT * FROM work_items WHERE status = 'IN_PROGRESS' LIMIT 5"
}
```

**Request:**
```bash
curl -X POST http://localhost:3000/ai/execute-sql \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM work_items WHERE status = '\''IN_PROGRESS'\'' LIMIT 5"
  }'
```

**Response (SELECT):** `200 OK`
```json
{
  "success": true,
  "type": "SELECT",
  "data": [
    {
      "id": "42",
      "category_id": "1",
      "title": "Fix payment gateway timeout",
      "description": "Payment processing fails after 30 seconds",
      "status": "IN_PROGRESS",
      "priority": "URGENT",
      "created_at": "2024-01-29T10:00:00.000Z"
    }
  ],
  "rowCount": 1
}
```

**Response (INSERT/UPDATE/DELETE):** `200 OK`
```json
{
  "success": true,
  "type": "MUTATION",
  "rowsAffected": 1
}
```

**Whitelisted Tables:**
- organizations
- categories
- work_items
- custom_field_meta_data
- custom_field_values
- work_item_logs

**Blocked Keywords:**
- DROP
- TRUNCATE
- ALTER
- CREATE
- GRANT
- REVOKE

**Error Response:** `400 Bad Request`
```json
{
  "success": false,
  "error": "SQL contains blocked keyword: DROP"
}
```

---

# RAG Endpoints

## 24. Search Work Items (RAG)

**Endpoint:** `POST /rag/search`

**Description:** Semantic search over work items using RAG.

**Request Body:**
```json
{
  "query": "payment gateway issues",
  "limit": 5,
  "minScore": 0.75
}
```

**Request:**
```bash
curl -X POST http://localhost:3000/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "payment gateway timeout database connection",
    "limit": 5,
    "minScore": 0.75
  }'
```

**Response:** `200 OK`
```json
{
  "success": true,
  "work_item_ids": [42, 15, 8, 23, 31]
}
```

**Empty Response (no matches):**
```json
{
  "success": true,
  "work_item_ids": []
}
```

**Parameters:**
- `query` (required) - Natural language search query
- `limit` (optional) - Max results (default: 5)
- `minScore` (optional) - Minimum relevance score (default: 0.75)

---

# Chatbot Endpoints

## 25. Get Chatbot Embed Token

**Endpoint:** `GET /chatbot/embed-token`

**Description:** Get JWT token for GTWY chatbot embed.

**Request:**
```bash
curl http://localhost:3000/chatbot/embed-token
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdfaWQiOjU4ODQ0LCJ2YXJpYWJsZXMiOnsib3JnX2lkIjoiMSIsInVzZXJfaWQiOiIxIn0sImlhdCI6MTcwNjUyMDAwMCwiZXhwIjoxNzA2NTIzNjAwfQ.signature"
}
```

---

# Complete Example Workflow

## Scenario: Create a bug report with custom fields

```bash
# 1. Create category
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "bugs",
    "name": "Bug Reports"
  }'
# Response: { "success": true, "data": { "id": "1", ... } }

# 2. Create custom fields
curl -X POST http://localhost:3000/categories/1/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Root Cause",
    "keyName": "root_cause",
    "dataType": "text",
    "description": "What caused this issue"
  }'
# Response: { "success": true, "data": { "id": "1", ... } }

curl -X POST http://localhost:3000/categories/1/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Severity",
    "keyName": "severity",
    "dataType": "number",
    "description": "Severity rating 1-10"
  }'
# Response: { "success": true, "data": { "id": "2", ... } }

# 3. Create work item
curl -X POST http://localhost:3000/work-items \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": 1,
    "title": "Payment gateway timeout",
    "description": "Payments fail after 30 seconds",
    "priority": "HIGH"
  }'
# Response: { "success": true, "data": { "id": "42", ... } }

# 4. Set custom field values
curl -X PATCH http://localhost:3000/work-items/42/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "root_cause": "Database connection pool exhaustion",
    "severity": 9
  }'
# Response: { "success": true, "data": { "root_cause": "...", "severity": 9 } }

# 5. Update work item status
curl -X PATCH http://localhost:3000/work-items/42 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS"
  }'
# Response: { "success": true, "data": { "id": "42", "status": "IN_PROGRESS", ... } }

# 6. Create subtask
curl -X POST http://localhost:3000/work-items/42/children \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Increase DB connection pool size",
    "priority": "HIGH"
  }'
# Response: { "success": true, "data": { "id": "43", "parentId": "42", ... } }

# 7. View logs
curl http://localhost:3000/work-items/42/logs
# Response: { "success": true, "data": [ ... logs ... ] }

# 8. Search via RAG
curl -X POST http://localhost:3000/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "payment database timeout connection pool",
    "limit": 5
  }'
# Response: { "success": true, "work_item_ids": [42, ...] }
```

---

# Status Codes Summary

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Missing required fields, invalid input, type mismatch |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate key_name, cannot delete with dependencies |
| 500 | Internal Server Error | Database error, unexpected failure |

---

# Data Type Reference

## WorkItemStatus
- `CAPTURED` - Initial state
- `CLARIFYING` - Gathering information
- `THINKING` - Planning solution
- `DECIDED` - Solution decided
- `IN_PROGRESS` - Work in progress
- `IN_REVIEW` - Under review
- `CLOSED` - Completed
- `ARCHIVED` - Archived

## WorkItemPriority
- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

## CustomFieldDataType
- `number` - Numeric values (stored as DECIMAL(15,4))
- `text` - String values (stored as TEXT)
- `boolean` - True/false (stored as BOOLEAN)
- `json` - JSON objects (stored as JSON)

## LogType
- `status_change` - Status changed
- `comment` - Comment added
- `sync` - External sync
- `ai_analysis` - AI analysis
- `field_update` - Field updated

---

**API Reference Version**: 1.0  
**Last Updated**: January 29, 2024
