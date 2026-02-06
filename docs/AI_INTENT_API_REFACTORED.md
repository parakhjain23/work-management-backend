# AI Intent API - Refactored Documentation

## Overview

The AI Intent API has been refactored to provide a clearer separation between **value-based operations** (affecting work item field values including custom fields) and **entity-based operations** (creating/modifying entities like categories and custom field metadata).

### Key Changes

1. **Combined Custom Field Updates**: Work item create/update operations now include custom field values
2. **Removed Redundant Intents**: `update_custom_field_value` and `update_work_item_status` merged into `work_item.update`
3. **Clearer Intent Naming**: Intent names now follow `entity.action` pattern
4. **Complete CRUD**: Added delete operations for categories and custom field metadata

---

## Intent Structure

### Value-Based Operations (Work Item)
These operations affect work item field values, including custom fields:
- `work_item.create` - Create work item with optional custom field values
- `work_item.update` - Update work item fields and/or custom field values
- `work_item.delete` - Delete work item

### Entity-Based Operations (Category)
These operations create/modify category entities:
- `category.create` - Create new category
- `category.update` - Update category metadata
- `category.delete` - Delete category

### Entity-Based Operations (Custom Field Metadata)
These operations create/modify custom field definitions:
- `custom_field_meta.create` - Create new custom field definition
- `custom_field_meta.update` - Update custom field metadata
- `custom_field_meta.delete` - Delete custom field definition

---

## Endpoint

```
POST /api/ai/intent
```

**Authentication:** Required (Bearer token)

---

## Test Cases

### 1. Create Work Item (with Custom Fields)

**Intent:** `work_item.create`

**Request:**
```json
{
  "intent": "work_item.create",
  "threadId": "12809",
  "payload": {
    "title": "Fix login bug",
    "description": "Users cannot login with Google OAuth",
    "category_id": 4,
    "priority": "HIGH",
    "status": "CAPTURED",
    "assignee_id": 12180,
    "custom_field_values": {
      "severity": "critical",
      "estimated_hours": 8,
      "is_blocking": true
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "type": "work_item_created",
    "id": "123",
    "data": {
      "id": "123",
      "title": "Fix login bug",
      "description": "Users cannot login with Google OAuth",
      "categoryId": "4",
      "priority": "HIGH",
      "status": "CAPTURED",
      "assigneeId": "12180",
      "createdAt": "2026-02-06T06:14:00.000Z"
    }
  }
}
```

---

### 2. Update Work Item (with Custom Fields)

**Intent:** `work_item.update`

**Request:**
```json
{
  "intent": "work_item.update",
  "threadId": "123",
  "payload": {
    "work_item_id": 123,
    "fields": {
      "status": "IN_PROGRESS",
      "priority": "URGENT",
      "description": "Updated: Critical login issue",
      "custom_field_values": {
        "severity": "critical",
        "estimated_hours": 12,
        "progress_percentage": 30
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "type": "work_item_updated",
    "id": "123",
    "data": {
      "id": "123",
      "title": "Fix login bug",
      "description": "Updated: Critical login issue",
      "status": "IN_PROGRESS",
      "priority": "URGENT",
      "updatedAt": "2026-02-06T06:20:00.000Z"
    }
  }
}
```

---

### 3. Update Only Custom Fields

**Intent:** `work_item.update`

**Request:**
```json
{
  "intent": "work_item.update",
  "threadId": "123",
  "payload": {
    "work_item_id": 123,
    "fields": {
      "custom_field_values": {
        "rating": 5,
        "status": "approved",
        "reviewed_by": "John Doe"
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "type": "work_item_updated",
    "id": "123",
    "data": {
      "id": "123",
      "updatedAt": "2026-02-06T06:25:00.000Z"
    }
  }
}
```

---

### 4. Update Only Status (Simplified)

**Intent:** `work_item.update`

**Request:**
```json
{
  "intent": "work_item.update",
  "threadId": "123",
  "payload": {
    "work_item_id": 123,
    "fields": {
      "status": "DONE"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "type": "work_item_updated",
    "id": "123",
    "data": {
      "id": "123",
      "status": "DONE",
      "updatedAt": "2026-02-06T06:30:00.000Z"
    }
  }
}
```

---

### 5. Delete Work Item

**Intent:** `work_item.delete`

**Request:**
```json
{
  "intent": "work_item.delete",
  "threadId": "123",
  "payload": {
    "work_item_id": 123
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "type": "work_item_deleted",
    "id": 123
  }
}
```

---

### 6. Create Category

**Intent:** `category.create`

**Request:**
```json
{
  "intent": "category.create",
  "threadId": "12809",
  "payload": {
    "key_name": "bugs",
    "name": "Bug Reports",
    "external_tool": "jira"
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "type": "category_created",
    "id": "5",
    "data": {
      "id": "5",
      "keyName": "bugs",
      "name": "Bug Reports",
      "externalTool": "jira",
      "orgId": "12809"
    }
  }
}
```

---

### 7. Update Category

**Intent:** `category.update`

**Request:**
```json
{
  "intent": "category.update",
  "threadId": "12809",
  "payload": {
    "category_id": 5,
    "fields": {
      "name": "Critical Bugs",
      "external_tool": "linear"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "type": "category_updated",
    "id": "5",
    "data": {
      "id": "5",
      "keyName": "bugs",
      "name": "Critical Bugs",
      "externalTool": "linear"
    }
  }
}
```

---

### 8. Delete Category

**Intent:** `category.delete`

**Request:**
```json
{
  "intent": "category.delete",
  "threadId": "12809",
  "payload": {
    "category_id": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "type": "category_deleted",
    "id": 5
  }
}
```

---

### 9. Create Custom Field Metadata

**Intent:** `custom_field_meta.create`

**Request:**
```json
{
  "intent": "custom_field_meta.create",
  "threadId": "12809",
  "payload": {
    "category_id": 4,
    "name": "Severity",
    "key_name": "severity",
    "data_type": "text",
    "description": "Bug severity level",
    "enums": "low,medium,high,critical",
    "meta": {
      "field_type": "single-select"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "type": "custom_field_meta_created",
    "id": "10",
    "data": {
      "id": "10",
      "categoryId": "4",
      "name": "Severity",
      "keyName": "severity",
      "dataType": "text",
      "description": "Bug severity level",
      "enums": "low,medium,high,critical",
      "meta": {
        "field_type": "single-select"
      }
    }
  }
}
```

---

### 10. Update Custom Field Metadata

**Intent:** `custom_field_meta.update`

**Request:**
```json
{
  "intent": "custom_field_meta.update",
  "threadId": "12809",
  "payload": {
    "custom_field_meta_id": 10,
    "fields": {
      "description": "Updated: Bug severity classification",
      "enums": "trivial,low,medium,high,critical",
      "meta": {
        "field_type": "single-select",
        "required": true
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "type": "custom_field_meta_updated",
    "id": "10",
    "data": {
      "id": "10",
      "description": "Updated: Bug severity classification",
      "enums": "trivial,low,medium,high,critical",
      "meta": {
        "field_type": "single-select",
        "required": true
      }
    }
  }
}
```

---

### 11. Delete Custom Field Metadata

**Intent:** `custom_field_meta.delete`

**Request:**
```json
{
  "intent": "custom_field_meta.delete",
  "threadId": "12809",
  "payload": {
    "custom_field_meta_id": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "type": "custom_field_meta_deleted",
    "id": 10
  }
}
```

---

## Error Cases

### Missing Required Field

**Request:**
```json
{
  "intent": "work_item.create",
  "threadId": "12809",
  "payload": {
    "description": "Missing title field"
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "title is required"
}
```

---

### Invalid threadId

**Request:**
```json
{
  "intent": "work_item.create",
  "threadId": "invalid-id",
  "payload": {
    "title": "Test"
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "threadId must be numeric (workItemId or orgId)"
}
```

---

### Invalid Intent Type

**Request:**
```json
{
  "intent": "invalid_intent",
  "threadId": "12809",
  "payload": {}
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Invalid intent type: invalid_intent"
}
```

---

## Available Intent Types

### Work Item Operations (Value-Based)
1. `work_item.create` - Create work item with optional custom field values
2. `work_item.update` - Update work item fields and/or custom field values
3. `work_item.delete` - Delete work item

### Category Operations (Entity-Based)
4. `category.create` - Create new category
5. `category.update` - Update category metadata
6. `category.delete` - Delete category

### Custom Field Metadata Operations (Entity-Based)
7. `custom_field_meta.create` - Create custom field definition
8. `custom_field_meta.update` - Update custom field metadata
9. `custom_field_meta.delete` - Delete custom field definition

---

## Migration Guide

### Old vs New Intent Names

| Old Intent | New Intent | Notes |
|------------|------------|-------|
| `create_work_item` | `work_item.create` | Now includes `custom_field_values` |
| `update_work_item` | `work_item.update` | Now includes `custom_field_values` |
| `delete_work_item` | `work_item.delete` | No change |
| `update_custom_field_value` | `work_item.update` | **Merged** - use `custom_field_values` in fields |
| `update_work_item_status` | `work_item.update` | **Merged** - use `status` in fields |
| `add_child_work_item` | `work_item.create` | **Removed** - use `parent_id` in create |
| `create_category` | `category.create` | Renamed |
| `update_category` | `category.update` | Renamed |
| N/A | `category.delete` | **New** |
| `create_custom_field` | `custom_field_meta.create` | Renamed |
| N/A | `custom_field_meta.update` | **New** |
| N/A | `custom_field_meta.delete` | **New** |

---

## Benefits

### 1. Simplified API
- Single intent for all work item updates (including custom fields)
- No need to call separate APIs for custom field updates

### 2. Atomic Operations
- Work item and custom field updates happen in one transaction
- Consistent event emission

### 3. Clearer Intent Structure
- `work_item.*` = affects values (including custom fields)
- `category.*` = manages category entities
- `custom_field_meta.*` = manages field definitions

### 4. Complete CRUD
- All entities now have full create, update, delete operations

---

## Implementation Notes

1. **Custom Field Values**: Automatically updated when included in `work_item.create` or `work_item.update`
2. **Event Emission**: All operations emit appropriate domain events for system prompt processing and RAG indexing
3. **Validation**: ThreadId must be numeric (workItemId or orgId)
4. **Authentication**: All requests require valid Bearer token
5. **Transaction Safety**: Work item and custom field updates are atomic

---

**Last Updated**: February 6, 2026  
**Version**: 2.0  
**Breaking Changes**: Yes - Intent names changed, some intents merged
