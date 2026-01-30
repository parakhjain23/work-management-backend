# RabbitMQ + RAG Integration - Complete Documentation

## Overview

This document describes the modular RabbitMQ integration for the RAG (Retrieval-Augmented Generation) pipeline. The refactor introduces asynchronous, durable message queuing while preserving all existing RAG behavior and business logic.

---

## Architecture

```
Service (DB mutation)
 ↓
Event Dispatcher
 ↓
RAG Event Handler (enqueue only)
 ↓
RabbitMQ Queue (rag.index.queue)
 ↓
RAG Queue Consumer (worker)
 ↓
RAG Consumer
 ↓
RAG Processor
 ↓
Document Builder + RAG Client → Hippocampus AI
```

---

## Key Design Principles

1. **Clean Separation**: Producer ≠ Queue ≠ Consumer
2. **No Breaking Changes**: Existing RAG behavior preserved
3. **Transport Only**: Queue infrastructure has no business logic
4. **Eventually Consistent**: RAG indexing happens asynchronously
5. **Failure Isolation**: Queue failures don't break API responses

---

## Folder Structure

```
src/
├── queue/
│   ├── rabbitmq.connection.ts       # RabbitMQ connection management
│   ├── rag.queue.publisher.ts       # Publish messages to queue
│   ├── rag.queue.consumer.ts        # Consume messages from queue
│   └── queue.types.ts                # Message contract types
│
├── rag/
│   ├── producer/
│   │   └── rag.event.handler.ts     # Event → Queue mapping (no RAG calls)
│   │
│   ├── consumer/
│   │   ├── rag.consumer.ts          # Message → Processor delegation
│   │   └── rag.processor.ts         # Business logic (RAG operations)
│   │
│   ├── core/
│   │   ├── rag.document.builder.ts  # Build searchable documents
│   │   ├── rag.rules.ts              # RAG trigger rules
│   │   ├── rag.client.ts             # Hippocampus API client
│   │   └── rag.types.ts              # Type definitions
│   │
│   ├── rag.producer.ts (OLD - deprecated)
│   ├── rag.consumer.ts (OLD - deprecated)
│   └── rag.document.builder.ts (OLD - deprecated)
│
├── workers/
│   └── rag.worker.bootstrap.ts      # Standalone worker process
```

---

## Message Contract

```typescript
type RagQueueMessage = {
  entity_type: "work_item" | "category" | "custom_field_value" | "custom_field_meta_data";
  action: "create" | "update" | "delete";
  entity_id: number;
  org_id: number;
  changed_fields?: string[];
  timestamp: string;
};
```

**Important**: Messages contain only metadata, not full DB records. Consumer re-fetches fresh state from database.

---

## Component Responsibilities

### 1. Queue Infrastructure (`src/queue/`)

#### `rabbitmq.connection.ts`
- Establishes connection to RabbitMQ
- Creates channel
- Asserts durable queue
- Handles connection errors and reconnection
- Exports `connectRabbitMQ()`, `getRabbitMQChannel()`, `closeRabbitMQ()`

#### `rag.queue.publisher.ts`
- **Transport only** - no business logic
- Publishes messages to `rag.index.queue`
- Marks messages as persistent
- Logs failures without breaking API flow
- Exports `publishToRagQueue(message)`

#### `rag.queue.consumer.ts`
- **Transport only** - no business logic
- Consumes messages from `rag.index.queue`
- Acknowledges on success
- Nacks on failure (no requeue)
- Exports `startRagQueueConsumer(onMessage)`

#### `queue.types.ts`
- Defines `RagQueueMessage` type
- Defines `RAG_QUEUE_NAME` constant

---

### 2. RAG Producer (`src/rag/producer/`)

#### `rag.event.handler.ts`
- Receives `MutationEvent` from event dispatcher
- Applies RAG trigger rules (delegates to `rag.rules.ts`)
- Maps event → `RagQueueMessage`
- Publishes to queue via `publishToRagQueue()`
- **Contains NO RabbitMQ code**
- **Contains NO RAG API calls**
- Exports `handleRagEvent(event)`

**Key Functions**:
- `handleRagEvent()` - Main entry point
- `handleWorkItemEvent()` - Work item create/update/delete
- `handleCustomFieldValueEvent()` - Custom field changes
- `handleCategoryEvent()` - Category name changes
- `handleCustomFieldMetaEvent()` - Custom field metadata changes

---

### 3. RAG Consumer (`src/rag/consumer/`)

#### `rag.consumer.ts`
- Accepts `RagQueueMessage` from queue consumer
- Delegates to `RagProcessor`
- Handles success/failure
- Throws error on failure to trigger nack
- Exports `RagConsumer` class

#### `rag.processor.ts`
- **All RAG business logic lives here**
- Re-fetches latest DB state
- Decides exact RAG operation (create/update/delete)
- Calls `RagDocumentBuilder` to build documents
- Calls `RagClient` to interact with Hippocampus AI
- Handles cascading updates (category, custom field meta)

**Key Functions**:
- `processMessage()` - Routes to appropriate handler
- `processWorkItemCreate()` - Index new work item
- `processWorkItemUpdate()` - Update existing work item
- `processWorkItemDelete()` - Remove work item from RAG
- `processCategoryUpdate()` - Cascade to all work items in category
- `processCustomFieldMetaUpdate()` - Cascade to all affected work items

---

### 4. RAG Core (`src/rag/core/`)

#### `rag.rules.ts`
- Contains all RAG trigger rules
- Determines WHEN RAG should be updated
- No changes to existing logic, just extracted

**Functions**:
- `shouldUpdateRagForWorkItem(sql)` - Check if work item update affects searchable content
- `shouldUpdateRagForCategory(sql)` - Check if category name changed
- `shouldUpdateRagForCustomFieldMeta(sql)` - Check if field name/description changed
- `extractWorkItemIdFromCustomFieldSql(sql)` - Extract work item ID from custom field SQL

#### `rag.document.builder.ts`
- Moved from `src/rag/rag.document.builder.ts`
- **No logic changes**
- Builds searchable documents from work items

#### `rag.client.ts`
- Moved from `src/rag/rag.client.ts`
- **No logic changes**
- Communicates with Hippocampus AI API

#### `rag.types.ts`
- Type definitions for RAG system
- `RagQueryResult`, `CollectionInfo`, `WorkItemDocument`

---

### 5. Worker (`src/workers/`)

#### `rag.worker.bootstrap.ts`
- **Standalone Node process** (separate from API server)
- Initializes RabbitMQ connection
- Creates `RagConsumer` instance
- Starts consuming messages
- Handles graceful shutdown
- Run with: `npm run worker:rag`

---

## Integration Points

### Event Dispatcher (`src/events/event.logger.ts`)

**Before**:
```typescript
const { RagProducer } = await import('../rag/rag.producer.js');
const ragProducer = new RagProducer();
await ragProducer.handleEvent(event);
```

**After**:
```typescript
const { handleRagEvent } = await import('../rag/producer/rag.event.handler.js');
await handleRagEvent(event);
```

### API Server (`src/index.ts`)

**Added**:
- RabbitMQ connection initialization on startup
- Graceful RabbitMQ shutdown on server shutdown
- Failure handling (server continues if RabbitMQ unavailable)

---

## Data Flow Examples

### Example 1: Work Item Creation

```
1. User creates work item
   POST /work-items { title: "Fix bug", categoryId: 1 }

2. Service layer
   - Inserts to database
   - Creates audit log
   - Emits event: { entity_type: 'work_item', action: 'CREATE', entity_id: 123 }

3. Event Dispatcher
   - Receives event
   - Calls handleRagEvent(event)

4. RAG Event Handler
   - Extracts org_id for work item 123
   - Creates message: {
       entity_type: 'work_item',
       action: 'create',
       entity_id: 123,
       org_id: 1,
       timestamp: '2026-01-30T...'
     }
   - Publishes to queue

5. RabbitMQ Queue
   - Message persisted in rag.index.queue

6. RAG Worker (separate process)
   - Consumes message
   - Calls RagConsumer.consumeMessage()

7. RAG Processor
   - Re-fetches work item 123 from database
   - Builds document (title, description, category, custom fields)
   - Calls RagClient.addResource()
   - Indexes in Hippocampus AI

8. Message acknowledged
```

### Example 2: Category Name Change (Cascading)

```
1. User updates category name
   PATCH /categories/5 { name: "Critical Bugs" }

2. Service layer
   - Updates database
   - Emits event: { entity_type: 'category', action: 'UPDATE', entity_id: 5 }

3. RAG Event Handler
   - Checks if name changed (shouldUpdateRagForCategory)
   - Extracts org_id for category 5
   - Publishes message to queue

4. RAG Processor
   - Queries all work items in category 5
   - Finds 15 work items
   - For each work item:
     - Re-fetches from database
     - Builds document (includes new category name)
     - Updates in RAG

5. All 15 work items now searchable with "Critical Bugs"
```

---

## Error Handling

### Publisher Side (API Server)

**If queue publish fails**:
- Error logged
- API response NOT affected
- User gets success response
- RAG indexing skipped (eventually consistent)

```typescript
try {
  await publishToRagQueue(message);
} catch (error) {
  console.error('[RAG Queue Publisher] Failed to publish message:', error);
  // Don't throw - API continues
}
```

### Consumer Side (Worker)

**If message processing fails**:
- Error logged
- Message nacked (not requeued)
- Worker continues processing next message

```typescript
try {
  await ragConsumer.consumeMessage(message);
  channel.ack(msg);
} catch (error) {
  console.error('[RAG Queue Consumer] Error processing message:', error);
  channel.nack(msg, false, false); // Don't requeue
}
```

---

## Configuration

### Environment Variables

```bash
# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672
```

### Queue Settings

- **Queue Name**: `rag.index.queue`
- **Durable**: `true` (survives RabbitMQ restart)
- **Persistent Messages**: `true` (messages written to disk)
- **Auto-delete**: `false`
- **Exclusive**: `false`

---

## Running the System

### 1. Start RabbitMQ

```bash
# Using Docker
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# Or install locally
# macOS: brew install rabbitmq
# Ubuntu: apt-get install rabbitmq-server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start API Server

```bash
npm run dev
```

**Output**:
```
🚀 Starting work-os-backend...
✅ Prisma client initialized
✅ Database connected
✅ RabbitMQ connected (RAG event publisher)
✅ Server running on port 3000
```

### 4. Start RAG Worker (separate terminal)

```bash
npm run worker:rag
```

**Output**:
```
============================================================
🚀 Starting RAG Worker...
============================================================
✅ RabbitMQ connected
✅ RAG worker started successfully
📥 Waiting for RAG indexing jobs...
============================================================
```

---

## Testing

### 1. Create Work Item

```bash
POST http://localhost:3000/work-items
{
  "categoryId": 1,
  "title": "Test RAG indexing",
  "description": "This should be indexed in RAG",
  "priority": "HIGH",
  "status": "CAPTURED"
}
```

**Expected Logs**:

**API Server**:
```
[RAG Event Handler] Publishing message: work_item create 123
[RAG Queue Publisher] Published message: work_item create 123
```

**RAG Worker**:
```
[RAG Queue Consumer] Received message: work_item create 123
[RAG Processor] Processing work_item create 123
[RAG Processor] Indexed work item 123
[RAG Queue Consumer] Message acknowledged
```

### 2. Update Work Item

```bash
PATCH http://localhost:3000/work-items/123
{
  "title": "Updated title"
}
```

**Expected**: Similar flow, message action = 'update'

### 3. Update Category Name

```bash
PATCH http://localhost:3000/categories/1
{
  "name": "Urgent Bugs"
}
```

**Expected**: Worker processes cascading updates for all work items in category

---

## Migration from Old System

### What Changed

1. **Old**: `RagProducer.handleEvent()` called RAG APIs directly
2. **New**: `handleRagEvent()` publishes to queue, worker processes async

### What Stayed the Same

1. RAG trigger rules (when to index)
2. Document building logic
3. Hippocampus API integration
4. Event emission from services
5. RAG search API (unchanged)

### Deprecated Files

- `src/rag/rag.producer.ts` - Replaced by `rag/producer/rag.event.handler.ts` + `rag/consumer/rag.processor.ts`
- Old files kept for reference, can be deleted after verification

---

## Benefits

### 1. Asynchronous Processing
- API responses no longer wait for RAG indexing
- Faster response times
- Better user experience

### 2. Durability
- Messages persisted to disk
- Survives RabbitMQ restart
- No lost indexing jobs

### 3. Scalability
- Multiple workers can consume from same queue
- Horizontal scaling ready
- Load distribution

### 4. Failure Isolation
- RAG failures don't break API
- Worker can restart independently
- Graceful degradation

### 5. Observability
- Clear separation of concerns
- Easy to monitor queue depth
- Worker health independent of API

---

## Future Enhancements (Not Implemented)

### Retry Strategy
- Dead letter queue for failed messages
- Exponential backoff
- Max retry count

### Batch Processing
- Batch multiple work items in single RAG call
- Reduce API overhead
- Better throughput

### Priority Queues
- High-priority indexing (user-facing)
- Low-priority indexing (background)

### Parallel Consumers
- Multiple worker instances
- Faster processing
- Better resource utilization

---

## Troubleshooting

### Issue: Worker not processing messages

**Check**:
1. RabbitMQ running: `docker ps` or `rabbitmqctl status`
2. Worker started: `npm run worker:rag`
3. Queue exists: RabbitMQ management UI (http://localhost:15672)
4. Messages in queue: Check queue depth

### Issue: Messages published but not consumed

**Check**:
1. Worker logs for errors
2. RabbitMQ connection in worker
3. Message format matches `RagQueueMessage` type

### Issue: API server can't connect to RabbitMQ

**Result**: API continues, RAG events not queued (graceful degradation)

**Fix**:
1. Start RabbitMQ
2. Restart API server
3. Check `RABBITMQ_URL` in `.env`

---

## Success Criteria ✅

- [x] RAG indexing is fully async
- [x] API server never calls Hippocampus directly
- [x] Events enqueue RAG jobs reliably
- [x] Worker consumes and processes jobs
- [x] Existing RAG behavior preserved
- [x] Codebase cleanly modularized
- [x] Producer ≠ Queue ≠ Consumer (clean separation)
- [x] Queue only transports messages (no logic)
- [x] All logic testable and composable
- [x] Failures isolated (API continues if queue fails)

---

## Summary

This refactor introduces RabbitMQ into the RAG pipeline with **zero breaking changes** to existing functionality. The system is now:

- **Asynchronous**: RAG indexing doesn't block API responses
- **Durable**: Messages persisted, survives restarts
- **Modular**: Clean separation of producer, queue, consumer
- **Scalable**: Ready for multiple workers
- **Resilient**: Failures isolated, graceful degradation

The architecture follows production best practices and sets the foundation for future enhancements like retries, batching, and priority queues.
