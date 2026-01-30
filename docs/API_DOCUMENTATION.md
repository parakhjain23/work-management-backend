# Frontend CRUD API Documentation

## Overview

This document describes all REST API endpoints for frontend UI operations. These endpoints are separate from the AI endpoints (`/ai/schema`, `/ai/execute-sql`) and are used exclusively for manual user interactions through the UI.

## Authentication

All endpoints use mock authentication middleware. The following user context is automatically injected:

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

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `404` - Not Found
- `409` - Conflict (duplicate key, constraint violation)
- `500` - Internal Server Error

---

# Categories API

## GET /categories

Fetch all categories for the user's organization.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "orgId": "1",
      "keyName": "bugs",
      "name": "Bug Reports",
      "externalTool": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## GET /categories/:categoryId

Fetch a single category by ID.

**Parameters:**
- `categoryId` (path) - Category ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "orgId": "1",
    "keyName": "bugs",
    "name": "Bug Reports",
    "externalTool": null
  }
}
```

**Errors:**
- `404` - Category not found

---

## POST /categories

Create a new category.

**Request Body:**
```json
{
  "keyName": "features",
  "name": "Feature Requests",
  "externalTool": "jira"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "2",
    "orgId": "1",
    "keyName": "features",
    "name": "Feature Requests",
    "externalTool": "jira"
  }
}
```

**Errors:**
- `400` - Missing required fields
- `409` - Category with this key_name already exists

---

## PATCH /categories/:categoryId

Update an existing category.

**Parameters:**
- `categoryId` (path) - Category ID

**Request Body:**
```json
{
  "name": "Critical Bugs",  // optional
  "externalTool": "linear"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Critical Bugs",
    "externalTool": "linear"
  }
}
```

**Errors:**
- `400` - No fields provided
- `404` - Category not found

---

## DELETE /categories/:categoryId

Delete a category.

**Parameters:**
- `categoryId` (path) - Category ID

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Category deleted successfully"
  }
}
```

**Errors:**
- `404` - Category not found
- `409` - Cannot delete category with existing work items

---

# Work Items API

## GET /work-items

Fetch all work items with optional filters.

**Query Parameters:**
- `categoryId` (optional) - Filter by category
- `status` (optional) - Filter by status (CAPTURED, CLARIFYING, THINKING, DECIDED, IN_PROGRESS, IN_REVIEW, CLOSED, ARCHIVED)
- `priority` (optional) - Filter by priority (LOW, MEDIUM, HIGH, URGENT)
- `limit` (optional) - Number of results (default: 50)
- `offset` (optional) - Pagination offset (default: 0)

**Example:**
```
GET /work-items?categoryId=1&status=IN_PROGRESS&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "42",
      "categoryId": "1",
      "title": "Fix payment bug",
      "description": "Payment processing fails",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "assigneeId": null,
      "parentId": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
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

## GET /categories/:categoryId/work-items

Fetch all work items in a specific category.

**Parameters:**
- `categoryId` (path) - Category ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "42",
      "title": "Fix payment bug",
      "category": {
        "id": "1",
        "name": "Bug Reports"
      }
    }
  ]
}
```

**Errors:**
- `404` - Category not found

---

## GET /work-items/:workItemId

Fetch a single work item by ID.

**Parameters:**
- `workItemId` (path) - Work item ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "42",
    "categoryId": "1",
    "title": "Fix payment bug",
    "description": "Payment processing fails",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "category": {
      "id": "1",
      "name": "Bug Reports",
      "keyName": "bugs"
    },
    "parent": null
  }
}
```

**Errors:**
- `404` - Work item not found

---

## POST /work-items

Create a new work item.

**Request Body:**
```json
{
  "categoryId": 1,
  "title": "Fix payment bug",
  "description": "Payment processing fails",  // optional
  "status": "CAPTURED",  // optional, default: CAPTURED
  "priority": "HIGH",  // optional
  "assigneeId": 5,  // optional
  "startDate": "2024-01-01",  // optional
  "dueDate": "2024-01-31",  // optional
  "parentId": 10  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "42",
    "categoryId": "1",
    "title": "Fix payment bug",
    "status": "CAPTURED",
    "category": {
      "id": "1",
      "name": "Bug Reports"
    }
  }
}
```

**Errors:**
- `400` - Missing required fields
- `404` - Category not found or parent work item not found

**Note:** A log entry is automatically created with message "Work item created"

---

## PATCH /work-items/:workItemId

Update an existing work item.

**Parameters:**
- `workItemId` (path) - Work item ID

**Request Body (all fields optional):**
```json
{
  "title": "Fix critical payment bug",
  "description": "Updated description",
  "status": "IN_PROGRESS",
  "priority": "URGENT",
  "categoryId": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "42",
    "title": "Fix critical payment bug",
    "status": "IN_PROGRESS",
    "priority": "URGENT"
  }
}
```

**Errors:**
- `400` - No fields provided
- `404` - Work item not found or new category not found

**Note:** A log entry is automatically created documenting the changes

---

## DELETE /work-items/:workItemId

Delete a work item.

**Parameters:**
- `workItemId` (path) - Work item ID

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Work item deleted successfully"
  }
}
```

**Errors:**
- `404` - Work item not found

---

## GET /work-items/:workItemId/children

Fetch all child work items.

**Parameters:**
- `workItemId` (path) - Parent work item ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "43",
      "parentId": "42",
      "title": "Subtask 1",
      "category": {
        "id": "1",
        "name": "Bug Reports"
      }
    }
  ]
}
```

**Errors:**
- `404` - Parent work item not found

---

## POST /work-items/:workItemId/children

Create a child work item.

**Parameters:**
- `workItemId` (path) - Parent work item ID

**Request Body:**
```json
{
  "title": "Subtask 1",
  "description": "First subtask",  // optional
  "status": "CAPTURED",  // optional
  "priority": "MEDIUM"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "43",
    "parentId": "42",
    "categoryId": "1",
    "title": "Subtask 1"
  }
}
```

**Errors:**
- `400` - Missing title
- `404` - Parent work item not found

**Note:** Child automatically inherits parent's category_id

---

# Custom Fields API

## GET /categories/:categoryId/custom-fields

Fetch all custom field metadata for a category.

**Parameters:**
- `categoryId` (path) - Category ID

**Response:**
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
      "description": "What caused this issue",
      "enums": null,
      "meta": null
    }
  ]
}
```

**Errors:**
- `404` - Category not found

---

## GET /custom-fields/:fieldId

Fetch a single custom field metadata by ID.

**Parameters:**
- `fieldId` (path) - Custom field ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Root Cause",
    "keyName": "root_cause",
    "dataType": "text",
    "description": "What caused this issue"
  }
}
```

**Errors:**
- `404` - Custom field not found

---

## POST /categories/:categoryId/custom-fields

Create a new custom field metadata.

**Parameters:**
- `categoryId` (path) - Category ID

**Request Body:**
```json
{
  "name": "Customer Impact",
  "keyName": "customer_impact",
  "dataType": "text",  // number, text, boolean, json
  "description": "Impact on customers",  // optional
  "enums": "Low,Medium,High",  // optional, comma-separated
  "meta": {  // optional
    "placeholder": "Select impact level"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "2",
    "categoryId": "1",
    "name": "Customer Impact",
    "keyName": "customer_impact",
    "dataType": "text"
  }
}
```

**Errors:**
- `400` - Missing required fields or invalid dataType
- `404` - Category not found
- `409` - Custom field with this key_name already exists

---

## PATCH /custom-fields/:fieldId

Update custom field metadata.

**Parameters:**
- `fieldId` (path) - Custom field ID

**Request Body (all fields optional):**
```json
{
  "name": "Customer Impact Level",
  "description": "Updated description",
  "enums": "Low,Medium,High,Critical",
  "meta": {
    "required": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "2",
    "name": "Customer Impact Level",
    "description": "Updated description"
  }
}
```

**Errors:**
- `400` - No fields provided
- `404` - Custom field not found

**Note:** dataType is IMMUTABLE and cannot be changed after creation

---

## DELETE /custom-fields/:fieldId

Delete custom field metadata.

**Parameters:**
- `fieldId` (path) - Custom field ID

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Custom field deleted successfully"
  }
}
```

**Errors:**
- `404` - Custom field not found

---

## GET /work-items/:workItemId/custom-fields

Fetch all custom field values for a work item.

**Parameters:**
- `workItemId` (path) - Work item ID

**Response:**
```json
{
  "success": true,
  "data": {
    "root_cause": "Database connection pool exhaustion",
    "customer_impact": "High",
    "is_critical": true,
    "estimated_hours": 8
  }
}
```

**Errors:**
- `404` - Work item not found

---

## PATCH /work-items/:workItemId/custom-fields

Update custom field values for a work item (UPSERT).

**Parameters:**
- `workItemId` (path) - Work item ID

**Request Body:**
```json
{
  "root_cause": "Database connection pool exhaustion",
  "customer_impact": "High",
  "is_critical": true,
  "estimated_hours": 8
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "root_cause": "Database connection pool exhaustion",
    "customer_impact": "High",
    "is_critical": true,
    "estimated_hours": 8
  }
}
```

**Errors:**
- `400` - No fields provided or type mismatch
- `404` - Work item not found or custom field not found

**Behavior:**
1. Resolves key_name to field_id
2. Validates data type matches field definition
3. UPSERTs into custom_field_values table
4. Creates log entry documenting changes

**Type Validation:**
- `number` fields expect numeric values
- `text` fields expect string values
- `boolean` fields expect true/false
- `json` fields accept any JSON value

---

# Work Item Logs API

## GET /work-items/:workItemId/logs

Fetch all logs for a work item (read-only).

**Parameters:**
- `workItemId` (path) - Work item ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "workItemId": "42",
      "logType": "field_update",
      "oldValue": null,
      "newValue": null,
      "message": "Work item created",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "2",
      "workItemId": "42",
      "logType": "field_update",
      "message": "Status changed from CAPTURED to IN_PROGRESS",
      "createdAt": "2024-01-02T00:00:00.000Z"
    }
  ]
}
```

**Errors:**
- `404` - Work item not found

**Note:** Logs are ordered by createdAt DESC (newest first)

---

# Data Types Reference

## WorkItemStatus Enum
- `CAPTURED` - Initial state
- `CLARIFYING` - Gathering information
- `THINKING` - Planning solution
- `DECIDED` - Solution decided
- `IN_PROGRESS` - Work in progress
- `IN_REVIEW` - Under review
- `CLOSED` - Completed
- `ARCHIVED` - Archived

## WorkItemPriority Enum
- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

## LogType Enum
- `status_change` - Status changed
- `comment` - Comment added
- `sync` - External sync
- `ai_analysis` - AI analysis
- `field_update` - Field updated

## DataType Enum
- `number` - Numeric values
- `text` - String values
- `boolean` - True/false
- `json` - JSON objects

---

# Architecture Notes

## Separation of Concerns

**Frontend REST APIs (this document):**
- Used for UI rendering
- Manual user actions
- CRUD operations
- Strict validation

**AI Endpoints (separate):**
- `/ai/schema` - Schema introspection
- `/ai/execute-sql` - SQL execution
- Used exclusively by GTWY chatbot
- No overlap with REST APIs

## Data Flow

```
Frontend UI → REST API → Controller → Service → Prisma → PostgreSQL
                                                    ↓
                                              Event Logger
                                                    ↓
                                              RAG Producer
```

## Logging

All mutations automatically create log entries:
- Work item creation
- Work item updates
- Custom field updates

Logs are immutable and read-only via API.

---

# Testing Examples

## Create Category
```bash
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "bugs",
    "name": "Bug Reports"
  }'
```

## Create Work Item
```bash
curl -X POST http://localhost:3000/work-items \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": 1,
    "title": "Fix payment bug",
    "description": "Payment fails on checkout",
    "priority": "HIGH"
  }'
```

## Update Custom Fields
```bash
curl -X PATCH http://localhost:3000/work-items/42/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "root_cause": "Database timeout",
    "customer_impact": "High"
  }'
```

## Fetch Work Item Logs
```bash
curl http://localhost:3000/work-items/42/logs
```

---

# Error Handling

All endpoints follow consistent error handling:

1. **Validation Errors (400):**
   - Missing required fields
   - Invalid data types
   - Type mismatches

2. **Not Found (404):**
   - Resource doesn't exist
   - Resource not in user's organization

3. **Conflict (409):**
   - Duplicate key_name
   - Cannot delete with dependencies

4. **Server Error (500):**
   - Database errors
   - Unexpected failures

All errors return:
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

---

# Future Enhancements

The following are NOT implemented (as per requirements):

- ❌ Authentication (using mock auth)
- ❌ Permissions/authorization
- ❌ Bulk operations
- ❌ GraphQL
- ❌ Real-time updates
- ❌ File uploads
- ❌ Search/filtering beyond basic query params

These can be added in future iterations without affecting the current architecture.
