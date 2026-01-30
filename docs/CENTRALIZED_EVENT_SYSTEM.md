# Centralized Event System Documentation

## Overview

This document describes the centralized event emission system implemented across all CUD (Create, Update, Delete) operations in the backend. Events are emitted **ONLY** from service methods after successful database mutations.

---

## Architecture Principles

### ✅ DO
- Emit events from service layer ONLY
- Emit events AFTER successful DB mutations
- Use standardized event shape
- Include changed_fields for updates
- Emit ONE event per API call (not per field)

### ❌ DON'T
- Emit events from controllers
- Emit events from AI intent router
- Emit events from frontend
- Emit events before DB mutation
- Emit multiple events for single operation
- Duplicate event logic

---

## Event Dispatcher

**File:** `src/events/event.dispatcher.centralized.ts`

**Purpose:** Single source of truth for all event emission

### Standard Event Shape

```typescript
interface StandardEvent {
  entity: 'work_item' | 'category' | 'custom_field' | 'custom_field_value';
  action: 'create' | 'update' | 'delete';
  entity_id: number | bigint;
  parent_id?: number | bigint;
  changed_fields?: string[];
  triggered_by: 'user' | 'ai' | 'system';
  timestamp: string;
  metadata?: any;
}
```

### Usage

```typescript
import { eventDispatcher, CentralizedEventDispatcher } from '../events/event.dispatcher.centralized.js';

// Emit work item event
await eventDispatcher.emit(
  CentralizedEventDispatcher.workItemEvent(
    'create',
    workItem.id,
    'user',
    ['title', 'description', 'status']
  )
);
```

---

## Event Emission by Service

### 1. CategoriesService

**File:** `src/services/categories.service.ts`

#### create()
```typescript
/**
 * Purpose: Create a new category and emit creation event
 */
async create(orgId: bigint, userId: bigint, data: CreateCategoryDto) {
  // ... validation ...
  
  const category = await this.prisma.category.create({ ... });

  // Emit event after successful DB mutation
  await eventDispatcher.emit(
    CentralizedEventDispatcher.categoryEvent(
      'create',
      category.id,
      'user',
      ['name', 'key_name']
    )
  );

  return category;
}
```

**Event Emitted:**
```json
{
  "entity": "category",
  "action": "create",
  "entity_id": "1",
  "changed_fields": ["name", "key_name"],
  "triggered_by": "user",
  "timestamp": "2024-01-29T10:00:00.000Z"
}
```

#### update()
```typescript
/**
 * Purpose: Update category and emit update event with changed fields
 */
async update(categoryId: bigint, orgId: bigint, userId: bigint, data: UpdateCategoryDto) {
  const updated = await this.prisma.category.update({ ... });

  // Emit event after successful DB mutation
  const changedFields = Object.keys(data);
  await eventDispatcher.emit(
    CentralizedEventDispatcher.categoryEvent(
      'update',
      updated.id,
      'user',
      changedFields
    )
  );

  return updated;
}
```

**Event Emitted:**
```json
{
  "entity": "category",
  "action": "update",
  "entity_id": "1",
  "changed_fields": ["name"],
  "triggered_by": "user",
  "timestamp": "2024-01-29T10:05:00.000Z"
}
```

#### delete()
```typescript
/**
 * Purpose: Delete category and emit deletion event
 */
async delete(categoryId: bigint, orgId: bigint) {
  await this.prisma.category.delete({ ... });

  // Emit event after successful DB mutation
  await eventDispatcher.emit(
    CentralizedEventDispatcher.categoryEvent(
      'delete',
      categoryId,
      'user'
    )
  );
}
```

---

### 2. WorkItemsService

**File:** `src/services/workItems.service.ts`

#### create()
```typescript
/**
 * Purpose: Create a new work item and emit creation event
 */
async create(orgId: bigint, userId: bigint, data: CreateWorkItemDto) {
  const workItem = await this.prisma.workItem.create({ ... });
  
  await this.prisma.workItemLog.create({ ... });

  // Emit event after successful DB mutation
  await eventDispatcher.emit(
    CentralizedEventDispatcher.workItemEvent(
      'create',
      workItem.id,
      'user',
      ['title', 'description', 'status', 'priority'],
      data.parentId  // Include parent_id if child work item
    )
  );

  return workItem;
}
```

**Event Emitted (Parent):**
```json
{
  "entity": "work_item",
  "action": "create",
  "entity_id": "42",
  "changed_fields": ["title", "description", "status", "priority"],
  "triggered_by": "user",
  "timestamp": "2024-01-29T10:00:00.000Z"
}
```

**Event Emitted (Child):**
```json
{
  "entity": "work_item",
  "action": "create",
  "entity_id": "43",
  "parent_id": "42",
  "changed_fields": ["title", "description", "status", "priority"],
  "triggered_by": "user",
  "timestamp": "2024-01-29T10:01:00.000Z"
}
```

#### update()
```typescript
/**
 * Purpose: Update work item and emit update event with changed fields
 */
async update(workItemId: bigint, orgId: bigint, userId: bigint, data: UpdateWorkItemDto) {
  const updated = await this.prisma.workItem.update({ ... });
  
  if (changes.length > 0) {
    await this.prisma.workItemLog.create({ ... });
  }

  // Emit event after successful DB mutation
  const changedFields = Object.keys(data);
  await eventDispatcher.emit(
    CentralizedEventDispatcher.workItemEvent(
      'update',
      updated.id,
      'user',
      changedFields
    )
  );

  return updated;
}
```

**Event Emitted:**
```json
{
  "entity": "work_item",
  "action": "update",
  "entity_id": "42",
  "changed_fields": ["status", "priority"],
  "triggered_by": "user",
  "timestamp": "2024-01-29T10:30:00.000Z"
}
```

#### delete()
```typescript
/**
 * Purpose: Delete work item and emit deletion event
 */
async delete(workItemId: bigint, orgId: bigint) {
  await this.prisma.workItem.delete({ ... });

  // Emit event after successful DB mutation
  await eventDispatcher.emit(
    CentralizedEventDispatcher.workItemEvent(
      'delete',
      workItemId,
      'user'
    )
  );
}
```

#### createChild()
```typescript
/**
 * Purpose: Create child work item (inherits category from parent)
 * Event is emitted by create() method
 */
async createChild(parentId: bigint, orgId: bigint, userId: bigint, data: Omit<CreateWorkItemDto, 'parentId'>) {
  const childData: CreateWorkItemDto = {
    ...data,
    categoryId: parent.categoryId,
    parentId
  };

  // create() method will emit the event with parent_id
  return await this.create(orgId, userId, childData);
}
```

---

### 3. CustomFieldsService

**File:** `src/services/customFields.service.ts`

#### createMeta()
```typescript
/**
 * Purpose: Create custom field metadata and emit creation event
 */
async createMeta(categoryId: bigint, orgId: bigint, userId: bigint, data: CreateCustomFieldMetaDto) {
  const field = await this.prisma.customFieldMetaData.create({ ... });

  // Emit event after successful DB mutation
  await eventDispatcher.emit(
    CentralizedEventDispatcher.customFieldEvent(
      'create',
      field.id,
      'user',
      ['name', 'key_name', 'data_type']
    )
  );

  return field;
}
```

#### updateMeta()
```typescript
/**
 * Purpose: Update custom field metadata and emit update event with changed fields
 */
async updateMeta(fieldId: bigint, orgId: bigint, userId: bigint, data: UpdateCustomFieldMetaDto) {
  const updated = await this.prisma.customFieldMetaData.update({ ... });

  // Emit event after successful DB mutation
  const changedFields = Object.keys(data);
  await eventDispatcher.emit(
    CentralizedEventDispatcher.customFieldEvent(
      'update',
      updated.id,
      'user',
      changedFields
    )
  );

  return updated;
}
```

#### deleteMeta()
```typescript
/**
 * Purpose: Delete custom field metadata and emit deletion event
 */
async deleteMeta(fieldId: bigint, orgId: bigint) {
  await this.prisma.customFieldMetaData.delete({ ... });

  // Emit event after successful DB mutation
  await eventDispatcher.emit(
    CentralizedEventDispatcher.customFieldEvent(
      'delete',
      fieldId,
      'user'
    )
  );
}
```

#### updateValues()
```typescript
/**
 * Purpose: Update custom field values (UPSERT) and emit single update event
 * Emits ONE event per API call, not per field
 */
async updateValues(workItemId: bigint, orgId: bigint, data: UpdateCustomFieldValuesDto) {
  // Loop through all fields and upsert
  for (const [keyName, value] of Object.entries(data)) {
    await this.prisma.customFieldValue.upsert({ ... });
  }

  if (changes.length > 0) {
    await this.prisma.workItemLog.create({ ... });
  }

  // Emit ONE event after all DB mutations complete
  const changedFields = Object.keys(data);
  await eventDispatcher.emit(
    CentralizedEventDispatcher.customFieldValueEvent(
      'update',
      workItemId,
      'user',
      changedFields
    )
  );

  return await this.findValuesByWorkItem(workItemId, orgId);
}
```

**Event Emitted:**
```json
{
  "entity": "custom_field_value",
  "action": "update",
  "entity_id": "42",
  "changed_fields": ["root_cause", "customer_impact", "estimated_hours"],
  "triggered_by": "user",
  "timestamp": "2024-01-29T10:45:00.000Z"
}
```

---

## Event Flow

```
User/AI Request
    ↓
Controller (validates, parses)
    ↓
Service Method
    ├─→ Validate data
    ├─→ Execute DB mutation (Prisma)
    ├─→ Create work item log (if applicable)
    └─→ Emit event (after success)
           ↓
    Event Dispatcher
           ├─→ Validate event shape
           ├─→ Log event
           └─→ Fan out (async)
                  ├─→ System Prompt Runner (placeholder)
                  └─→ RAG Producer (placeholder)
                         ↓
    Response to client
```

---

## Event Consumers (Placeholders)

### System Prompt Runner

**File:** `src/systemPrompts/runner.ts` (placeholder)

**Purpose:** Execute system prompts based on events

**Current Behavior:**
- Logs what WOULD execute
- Does NOT call AI yet
- Keeps architecture clean

**Example Log:**
```
[Event Dispatcher → System Prompts] Would process: {
  entity: 'work_item',
  action: 'update',
  entity_id: '42',
  changed_fields: ['status']
}
```

### RAG Producer

**File:** `src/rag/rag.producer.ts` (placeholder)

**Purpose:** Index work items to vector database

**Current Behavior:**
- Logs what WOULD index
- Does NOT call RAG API yet
- Keeps architecture clean

**Example Log:**
```
[Event Dispatcher → RAG Producer] Would index: {
  entity: 'work_item',
  action: 'create',
  entity_id: '42'
}
```

---

## AI Intent Router

**File:** `src/ai/intent.router.ts`

**Important:** IntentRouter does NOT emit events directly. It calls service methods, which emit events.

```typescript
// ❌ WRONG - Don't emit events from IntentRouter
await this.eventDispatcher.dispatch(...);

// ✅ CORRECT - Service emits event
const workItem = await this.workItemsService.create(orgId, userId, data);
// Event is emitted by service layer
return { success: true, result: { ... } };
```

---

## Testing Event Emission

### Test 1: Create Work Item via REST API

```bash
curl -X POST http://localhost:3000/work-items \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": 1,
    "title": "Test work item",
    "priority": "HIGH"
  }'
```

**Expected Server Logs:**
```
[Event Dispatcher] Event emitted: {
  "entity": "work_item",
  "action": "create",
  "entity_id": "1",
  "changed_fields": ["title", "description", "status", "priority"],
  "triggered_by": "user",
  "timestamp": "2024-01-29T..."
}
[Event Dispatcher → System Prompts] Would process: {...}
[Event Dispatcher → RAG Producer] Would index: {...}
```

### Test 2: Update Work Item via AI Intent

```bash
curl -X POST http://localhost:3000/ai/intent \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "update_work_item",
    "payload": {
      "work_item_id": 1,
      "fields": {
        "status": "IN_PROGRESS"
      }
    },
    "threadId": "workItem:1"
  }'
```

**Expected Server Logs:**
```
[Intent API] Processing intent: update_work_item for org: 1, thread: workItem:1
[Event Dispatcher] Event emitted: {
  "entity": "work_item",
  "action": "update",
  "entity_id": "1",
  "changed_fields": ["status"],
  "triggered_by": "user",
  "timestamp": "2024-01-29T..."
}
[Event Dispatcher → System Prompts] Would process: {...}
[Event Dispatcher → RAG Producer] Would index: {...}
```

### Test 3: Update Custom Fields

```bash
curl -X PATCH http://localhost:3000/work-items/1/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "root_cause": "Database timeout",
    "severity": 9
  }'
```

**Expected Server Logs:**
```
[Event Dispatcher] Event emitted: {
  "entity": "custom_field_value",
  "action": "update",
  "entity_id": "1",
  "changed_fields": ["root_cause", "severity"],
  "triggered_by": "user",
  "timestamp": "2024-01-29T..."
}
```

---

## Verification Checklist

### ✅ Event Emission
- [ ] Creating work item emits EXACTLY ONE event
- [ ] Updating work item emits EXACTLY ONE event
- [ ] Deleting work item emits EXACTLY ONE event
- [ ] Creating category emits EXACTLY ONE event
- [ ] Updating category emits EXACTLY ONE event
- [ ] Deleting category emits EXACTLY ONE event
- [ ] Creating custom field emits EXACTLY ONE event
- [ ] Updating custom field emits EXACTLY ONE event
- [ ] Deleting custom field emits EXACTLY ONE event
- [ ] Updating custom field values emits EXACTLY ONE event

### ✅ Event Shape
- [ ] All events have required fields (entity, action, entity_id, triggered_by, timestamp)
- [ ] Update events include changed_fields
- [ ] Child work items include parent_id
- [ ] Events are valid StandardEvent objects

### ✅ Event Timing
- [ ] Events emitted AFTER successful DB mutation
- [ ] No events emitted on failed DB writes
- [ ] No events emitted on validation errors

### ✅ Event Source
- [ ] Events emitted from services ONLY
- [ ] No events from controllers
- [ ] No events from IntentRouter
- [ ] No events from frontend

---

## Error Handling

### Event Emission Failure

If event emission fails:
- ✅ DB mutation is NOT rolled back
- ✅ Error is logged
- ✅ Response is still returned to client
- ✅ Event consumers must be resilient

```typescript
public async emit(event: StandardEvent): Promise<void> {
  try {
    this.validateEvent(event);
    console.log('[Event Dispatcher] Event emitted:', ...);
    
    setImmediate(async () => {
      try {
        await this.fanOut(event);
      } catch (error) {
        console.error('[Event Dispatcher] Fan-out error:', error);
        // Don't throw - event consumers must be resilient
      }
    });
  } catch (error) {
    // Log error but don't throw - don't break the response
    console.error('[Event Dispatcher] Event emission error:', error);
  }
}
```

---

## Future Enhancements

### 1. Event Persistence
- Store events in `event_logs` table
- Enable event replay
- Audit trail

### 2. Event Queue
- Use message queue (RabbitMQ, Kafka)
- Retry failed events
- Guaranteed delivery

### 3. Event Filtering
- Subscribe to specific event types
- Filter by entity, action, or fields
- Conditional execution

### 4. Event Aggregation
- Batch multiple events
- Reduce duplicate processing
- Performance optimization

### 5. Event Metrics
- Track event volume
- Monitor processing time
- Alert on failures

---

## Benefits Achieved

### 🎯 Centralization
- Single source of truth for events
- No duplicate event logic
- Easy to maintain

### 🔒 Reliability
- Events emitted after DB success
- Transaction-safe
- No partial states

### 🧩 Clean Architecture
- Services own state + events
- Controllers remain thin
- Clear separation of concerns

### 🧪 Testability
- Easy to test event emission
- Easy to mock event dispatcher
- Easy to verify event shape

### 📈 Extensibility
- Easy to add new event consumers
- Easy to add new event types
- Future-proof architecture

---

## Summary

The centralized event system provides a **reliable, maintainable, and extensible** foundation for tracking all mutations in the system. Events are emitted ONLY from service methods after successful database mutations, ensuring consistency and enabling future features like system prompts, RAG indexing, and automation.

**Key Takeaway:** Services own both **state** (database mutations) and **events** (change notifications). Controllers and AI routers remain thin orchestration layers.

---

**Documentation Version**: 1.0  
**Last Updated**: January 29, 2024  
**Status**: ✅ Implemented and Ready for Testing
