# MODULE 2: CRUD APIs - Function Documentation

## File: `src/controllers/categories.controller.ts`

### `getCategories(request, response)`
→ Fetch all categories for organization, return JSON

### `getCategoryById(request, response)`
→ Fetch single category by ID, return JSON

### `createCategory(request, response)`
→ Validate input, call service to create category, return JSON

### `updateCategory(request, response)`
→ Validate input, call service to update category, return JSON

### `deleteCategory(request, response)`
→ Call service to delete category, return success message

---

## File: `src/services/categories.service.ts`

### `findAll(orgId)`
→ Query database for all categories in organization

### `findById(categoryId, orgId)`
→ Query database for category by ID, throw error if not found

### `create(orgId, userId, data)`
→ Insert category in DB, emit event, return category

### `update(categoryId, orgId, userId, data)`
→ Update category in DB, emit event with changed fields, return category

### `delete(categoryId, orgId)`
→ Delete category from DB, emit event

---

## File: `src/controllers/workItems.controller.ts`

### `getWorkItems(request, response)`
→ Parse filters from query params, fetch work items, return JSON

### `getWorkItemById(request, response)`
→ Fetch single work item by ID, return JSON

### `createWorkItem(request, response)`
→ Validate input, call service to create work item, return JSON

### `updateWorkItem(request, response)`
→ Validate input, call service to update work item, return JSON

### `deleteWorkItem(request, response)`
→ Call service to delete work item, return success message

### `getChildren(request, response)`
→ Fetch child work items for parent, return JSON

### `createChild(request, response)`
→ Validate input, call service to create child work item, return JSON

---

## File: `src/services/workItems.service.ts`

### `findAll(orgId, filters)`
→ Query database with filters (category, status, priority), return work items

### `findById(workItemId, orgId)`
→ Query database for work item by ID with relations, throw error if not found

### `findByCategory(categoryId, orgId)`
→ Query database for all work items in category

### `findChildren(workItemId, orgId)`
→ Query database for child work items of parent

### `create(orgId, userId, data)`
→ Validate category exists, insert work item in DB, create log, emit event, return work item

### `update(workItemId, orgId, userId, data)`
→ Fetch existing work item, track changes, update in DB, create log, emit event, return work item

### `delete(workItemId, orgId)`
→ Validate work item exists, delete from DB, emit event

### `createChild(parentId, orgId, userId, data)`
→ Fetch parent work item, inherit category, call create() with parentId

---

## File: `src/controllers/customFields.controller.ts`

### `getCustomFieldsByCategory(request, response)`
→ Fetch custom field metadata for category, return JSON

### `getCustomFieldById(request, response)`
→ Fetch single custom field metadata by ID, return JSON

### `createCustomField(request, response)`
→ Validate input, call service to create custom field metadata, return JSON

### `updateCustomField(request, response)`
→ Validate input, call service to update custom field metadata, return JSON

### `deleteCustomField(request, response)`
→ Call service to delete custom field metadata, return success message

### `getCustomFieldValues(request, response)`
→ Fetch custom field values for work item, return key-value pairs

### `updateCustomFieldValues(request, response)`
→ Validate input, call service to upsert custom field values, return JSON

---

## File: `src/services/customFields.service.ts`

### `findMetaByCategory(categoryId, orgId)`
→ Query database for custom field metadata in category

### `findMetaById(fieldId, orgId)`
→ Query database for custom field metadata by ID, throw error if not found

### `createMeta(categoryId, orgId, userId, data)`
→ Validate category exists, insert custom field metadata in DB, emit event, return field

### `updateMeta(fieldId, orgId, userId, data)`
→ Fetch existing field, update in DB, emit event with changed fields, return field

### `deleteMeta(fieldId, orgId)`
→ Validate field exists, delete from DB, emit event

### `findValuesByWorkItem(workItemId, orgId)`
→ Query database for custom field values, return as key-value pairs

### `updateValues(workItemId, orgId, data)`
→ Validate work item exists, validate each field type, upsert values in DB, create log, emit ONE event, return all values

---

## File: `src/controllers/intent.controller.ts`

### `executeIntent(request, response)`
→ Validate intent request, call intent router, serialize BigInt, return JSON

---

## File: `src/ai/intent.router.ts`

### `route(request, orgId, userId)`
→ Validate intent type, validate threadId scope, route to handler, return result

### `handleCreateWorkItem(payload, orgId, userId)`
→ Validate payload, call workItemsService.create(), return success result

### `handleUpdateWorkItem(payload, orgId, userId)`
→ Validate payload, call workItemsService.update(), return success result

### `handleDeleteWorkItem(payload, orgId, userId)`
→ Validate payload, call workItemsService.delete(), return success result

### `handleCreateCategory(payload, orgId, userId)`
→ Validate payload, call categoriesService.create(), return success result

### `handleUpdateCategory(payload, orgId, userId)`
→ Validate payload, call categoriesService.update(), return success result

### `handleDeleteCategory(payload, orgId, userId)`
→ Validate payload, call categoriesService.delete(), return success result

### `handleUpdateCustomFieldValue(payload, orgId, userId)`
→ Validate payload, call customFieldsService.updateValues(), return success result

### `validateThreadScope(intent, payload, threadId)`
→ Check if threadId matches entity scope (org:X:global or workItem:Y), return validation result

---

## Event Flow

```
REST API Request
    ↓
Controller (validate)
    ↓
Service Layer
    ├─→ DB Mutation
    ├─→ Audit Log
    └─→ Event Dispatcher
    ↓
Response (serialize BigInt)
```
