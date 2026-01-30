# MODULE 2: CRUD APIs

## Work Item Flow

```
1. Create Work Item
   ├─ User sends POST /work-items with title, category, description
   ├─ Check if category exists in their org
   ├─ Save work item to database
   ├─ Log the creation in audit trail
   ├─ Emit event (triggers RAG indexing)
   └─ Return created work item

2. Update Work Item
   ├─ User sends PATCH /work-items/:id with changes
   ├─ Find existing work item
   ├─ Track what changed (old vs new)
   ├─ Update in database
   ├─ Log changes in audit trail
   ├─ Emit event with changed fields
   └─ Return updated work item

3. Delete Work Item
   ├─ User sends DELETE /work-items/:id
   ├─ Find work item
   ├─ Delete from database (auto-deletes logs too)
   ├─ Emit event (triggers RAG removal)
   └─ Return success

4. Update Custom Fields
   ├─ User sends PATCH /work-items/:id/custom-fields with field values
   ├─ Validate each field exists and type is correct
   ├─ Save all field values
   ├─ Log changes
   ├─ Emit one event for all changes
   └─ Return all custom field values
```

---

## Pseudo Code

```typescript
CREATE_WORK_ITEM(request):
  # Get user's org and check category exists
  category = FIND_CATEGORY(request.body.categoryId, user.org_id)
  
  # Save work item
  work_item = DB_INSERT("work_items", request.body)
  
  # Log it
  DB_INSERT("work_item_logs", "Work item created")
  
  # Emit event (RAG will index it)
  EMIT_EVENT("work_item", "create", work_item.id)
  
  RETURN work_item


UPDATE_WORK_ITEM(work_item_id, request):
  # Find existing and track changes
  existing = FIND_WORK_ITEM(work_item_id, user.org_id)
  changes = COMPARE(existing, request.body)
  
  # Update it
  work_item = DB_UPDATE("work_items", work_item_id, request.body)
  
  # Log changes
  FOR each change:
      DB_INSERT("work_item_logs", change.field + " updated")
  
  # Emit event with what changed
  EMIT_EVENT("work_item", "update", work_item.id, changes)
  
  RETURN work_item


DELETE_WORK_ITEM(work_item_id):
  # Delete (auto-removes logs and custom fields)
  DB_DELETE("work_items", work_item_id)
  
  # Emit event (RAG will remove it)
  EMIT_EVENT("work_item", "delete", work_item_id)
  
  RETURN success


UPDATE_CUSTOM_FIELDS(work_item_id, field_values):
  # Validate each field and save
  FOR each (field_name, value) in field_values:
      field_meta = FIND_FIELD_META(field_name, user.org_id)
      VALIDATE_TYPE(value, field_meta.data_type)
      DB_UPSERT("custom_field_values", work_item_id, field_meta.id, value)
  
  # Log and emit one event for all changes
  DB_INSERT("work_item_logs", "Custom fields updated")
  EMIT_EVENT("custom_field_value", "update", work_item_id, field_names)
  
  RETURN all_custom_field_values


AI_INTENT_API(request):
  # Validate intent and threadId scope
  VALIDATE_INTENT(request.body.intent)
  VALIDATE_SCOPE(request.body.threadId, request.body.payload)
  
  # Route to appropriate service
  SWITCH request.body.intent:
      CASE 'create_work_item':
          result = CREATE_WORK_ITEM(request.body.payload)
      CASE 'update_work_item':
          result = UPDATE_WORK_ITEM(payload.work_item_id, payload.fields)
      CASE 'update_custom_field_value':
          result = UPDATE_CUSTOM_FIELDS(payload.work_item_id, payload.values)
  
  RETURN result
```
