# RAG (Retrieval-Augmented Generation) Implementation Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Folder Structure](#folder-structure)
4. [Components](#components)
5. [APIs & Endpoints](#apis--endpoints)
6. [Event Flow](#event-flow)
7. [External Services](#external-services)
8. [Configuration](#configuration)
9. [Queue System](#queue-system)
10. [Data Models](#data-models)
11. [Usage Examples](#usage-examples)

---

## Overview

The RAG system provides semantic search capabilities for work items using the Hippocampus AI service. It automatically indexes work items and their metadata into a vector database, enabling natural language queries to find relevant work items.

### Key Features
- **Automatic Indexing**: Work items are automatically indexed when created/updated
- **Semantic Search**: Natural language queries to find relevant work items
- **Real-time Updates**: Changes to work items, categories, and custom fields trigger re-indexing
- **Multi-tenant**: Each organization has its own isolated collection
- **Cascading Updates**: Changes to categories or custom field metadata update all affected work items

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Server                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Work Items   │  │ Categories   │  │ Custom Fields│          │
│  │ Service      │  │ Service      │  │ Service      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                   ┌────────▼────────┐                           │
│                   │ Domain Event    │                           │
│                   │ Dispatcher      │                           │
│                   └────────┬────────┘                           │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   RabbitMQ      │
                    │ (Topic Exchange)│
                    └────────┬────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
        ┌────────▼────────┐    ┌────────▼────────┐
        │   RAG Queue     │    │ SystemPrompt    │
        │ (work_item.*)   │    │     Queue       │
        └────────┬────────┘    └─────────────────┘
                 │
        ┌────────▼────────┐
        │   RAG Worker    │
        │   (Standalone)  │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │  RAG Processor  │
        │  - Index        │
        │  - Update       │
        │  - Delete       │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │  RAG Client     │
        │ (Hippocampus)   │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Hippocampus AI  │
        │ Vector Database │
        └─────────────────┘
```

---

## Folder Structure

```
backend/
├── src/
│   ├── rag/
│   │   ├── consumer/
│   │   │   ├── rag.consumer.ts          # Message consumer (delegates to processor)
│   │   │   └── rag.processor.ts         # Business logic for indexing
│   │   ├── core/
│   │   │   ├── rag.client.ts            # Hippocampus API client
│   │   │   ├── rag.document.builder.ts  # Document formatting
│   │   │   ├── rag.rules.ts             # Indexing rules
│   │   │   └── rag.types.ts             # Type definitions
│   │   ├── producer/
│   │   │   └── rag.event.handler.ts     # Event handling (legacy)
│   │   ├── rag.client.ts                # Main RAG client (root)
│   │   ├── rag.consumer.ts              # Search API handler
│   │   ├── rag.document.builder.ts      # Document builder (root)
│   │   └── rag.producer.ts              # Event producer (legacy)
│   ├── queue/
│   │   ├── rabbitmq.connection.ts       # RabbitMQ connection manager
│   │   ├── rag.queue.consumer.ts        # Queue transport layer
│   │   ├── rag.queue.publisher.ts       # Queue publisher (legacy)
│   │   └── queue.types.ts               # Queue message types
│   ├── routes/
│   │   └── rag.route.ts                 # RAG API routes
│   ├── workers/
│   │   └── rag.worker.bootstrap.ts      # RAG worker startup
│   └── events/
│       ├── domain.event.dispatcher.ts   # Event emission
│       └── domain.event.publisher.ts    # RabbitMQ publisher
├── docs/
│   ├── RAG_SYSTEM_DOCUMENTATION.md
│   ├── MODULE_1_RAG_FUNCTIONS.md
│   └── RAG_IMPLEMENTATION_COMPLETE.md   # This file
├── PHASE6_RAG.md
└── RABBITMQ_RAG_INTEGRATION.md
```

---

## Components

### 1. **RAG Client** (`src/rag/core/rag.client.ts`)

**Purpose**: Interface with Hippocampus AI API for vector operations

**Key Methods**:
- `createCollection(orgId: string)`: Create/get organization collection
- `addResource(collectionId, resourceId, title, content, ownerId)`: Index new document
- `updateResource(resourceId, title, content)`: Update existing document
- `deleteResource(resourceId)`: Remove document from index
- `query(collectionId, queryText, ownerId, limit, minScore)`: Semantic search

**Configuration**:
```typescript
// Environment Variables
HIPPOCAMPUS_API_URL = 'https://api.hippocampus.ai'
HIPPOCAMPUS_API_KEY = '<your-api-key>'

// Collection Settings
{
  denseModel: 'BAAI/bge-large-en-v1.5',      // Dense embeddings
  sparseModel: 'Qdrant/bm25',                 // Sparse embeddings (BM25)
  rerankerModel: 'colbert-ir/colbertv2.0',   // Re-ranking model
  chunkSize: 1000,                            // Document chunk size
  chunkOverlap: 100                           // Overlap between chunks
}
```

**Features**:
- Collection caching (in-memory)
- Automatic retry with exponential backoff (2 retries)
- Error handling for missing resources

---

### 2. **RAG Document Builder** (`src/rag/core/rag.document.builder.ts`)

**Purpose**: Build searchable documents from work item data

**Document Structure**:
```typescript
interface WorkItemDocument {
  workItemId: number;
  title: string;
  content: string;  // Formatted text content
}
```

**Document Format**:
```
Work Item: <title>

Description:
<description>

Category:
<category_name>

Custom Fields:
- <field_key_name> (<field_description>): <value>
- <field_key_name>: <value>
```

**Indexed Fields**:
- Title
- Description
- Category name
- Custom field values (text and boolean only)
- Custom field descriptions

**Example Output**:
```
Work Item: Login flow

Description:
Login flow is very slow.

Category:
Feedback

Custom Fields:
- rating (rating): 5
- status (status of feedback): approved
```

---

### 3. **RAG Processor** (`src/rag/consumer/rag.processor.ts`)

**Purpose**: Process RAG queue messages and perform indexing operations

**Supported Entity Types**:
1. **work_item**: Direct indexing operations
2. **custom_field_value**: Updates parent work item
3. **category**: Cascading update to all work items in category
4. **custom_field_meta_data**: Cascading update to all work items using that field

**Actions**:
- `create`: Index new work item
- `update`: Re-index existing work item
- `delete`: Remove work item from index

**Cascading Logic**:
- **Category Update**: Re-indexes all work items in that category
- **Custom Field Meta Update**: Re-indexes all work items using that custom field

---

### 4. **RAG Consumer** (`src/rag/consumer/rag.consumer.ts`)

**Purpose**: Accept queue messages and delegate to processor

**Responsibilities**:
- Receive messages from queue transport layer
- Log processing status
- Throw errors on failure (triggers nack)

---

### 5. **RAG Queue Consumer** (`src/queue/rag.queue.consumer.ts`)

**Purpose**: Transport layer for RabbitMQ message consumption

**Features**:
- Message acknowledgment on success
- Message nack (no requeue) on failure
- JSON parsing and validation
- Error handling and logging

---

### 6. **RAG Worker** (`src/workers/rag.worker.bootstrap.ts`)

**Purpose**: Standalone worker process for RAG indexing

**Lifecycle**:
1. Load environment variables
2. Connect to RabbitMQ
3. Start queue consumer
4. Process messages continuously
5. Graceful shutdown on SIGTERM/SIGINT

**Run Command**:
```bash
npm run worker:rag
# or
tsx src/workers/rag.worker.bootstrap.ts
```

---

## APIs & Endpoints

### **POST /api/ai/rag-search**

**Purpose**: Semantic search for work items using natural language

**Authentication**: Required (Bearer token)

**Request**:
```typescript
{
  query: string;        // Natural language search query (required)
  limit?: number;       // Max results to return (default: 5)
  minScore?: number;    // Minimum similarity score (default: 0.75)
}
```

**Request Example**:
```json
{
  "query": "bugs related to login performance",
  "limit": 10,
  "minScore": 0.7
}
```

**Response**:
```typescript
{
  success: boolean;
  work_item_ids: number[];  // Array of matching work item IDs
}
```

**Response Example**:
```json
{
  "success": true,
  "work_item_ids": [8, 15, 23, 42]
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Query is required"
}
```

**Implementation** (`src/rag/rag.consumer.ts`):
1. Validate query parameter
2. Get organization ID from authenticated user
3. Get/create collection for organization
4. Query Hippocampus API
5. Extract work item IDs from resource IDs (`workItem:123` → `123`)
6. Return filtered results

---

## Event Flow

### **Event Emission**

Events are emitted from service layers when entities change:

**1. Work Item Events** (`src/services/workItems.service.ts`):
```typescript
// CREATE
await domainEventDispatcher.emit(
  DomainEventDispatcher.workItemEvent(
    'create',
    workItemId,
    orgId,
    categoryId,
    'user',
    ['title', 'description', ...]
  )
);

// UPDATE
await domainEventDispatcher.emit(
  DomainEventDispatcher.workItemEvent(
    'update',
    workItemId,
    orgId,
    categoryId,
    'user',
    changedFields,
    fieldChanges
  )
);

// DELETE
await domainEventDispatcher.emit(
  DomainEventDispatcher.workItemEvent(
    'delete',
    workItemId,
    orgId,
    categoryId,
    'user',
    []
  )
);
```

**2. Category Events** (`src/services/categories.service.ts`):
```typescript
await domainEventDispatcher.emit(
  DomainEventDispatcher.categoryEvent(
    'update',
    categoryId,
    orgId,
    'user',
    ['name']  // Only triggers RAG update if 'name' changed
  )
);
```

**3. Custom Field Value Events** (`src/services/customFields.service.ts`):
```typescript
await domainEventDispatcher.emit(
  DomainEventDispatcher.customFieldValueEvent(
    'update',
    workItemId,
    orgId,
    categoryId,
    'user',
    changedFieldKeys
  )
);
```

### **Event Structure**

**Domain Event** (`src/types/events.types.ts`):
```typescript
{
  actionType: 'work_item',  // Routes to appropriate queue
  data: {
    entity: 'work_item',
    action: 'update',
    entity_id: '8',
    work_item_id: '8',
    org_id: '1',
    category_id: '4',
    triggered_by: 'user',
    changedFields: ['title', 'description'],
    fieldChanges: { ... },
    timestamp: '2026-02-04T07:00:00.000Z'
  }
}
```

### **Event Publishing**

**Publisher** (`src/events/domain.event.publisher.ts`):
```typescript
// Routing key format: {entity}.{action}
const routingKey = `${event.data.entity}.${event.data.action}`;
// Examples: work_item.create, work_item.update, category.update

channel.publish(
  EVENTS_EXCHANGE,  // 'domain.events'
  routingKey,              // 'work_item.update'
  Buffer.from(JSON.stringify(event)),
  {
    persistent: true,
    contentType: 'application/json',
    timestamp: Date.now()
  }
);
```

### **Queue Routing**

**RabbitMQ Configuration** (`src/queue/rabbitmq.connection.ts`):
```typescript
// Exchange: topic type
await channel.assertExchange('domain.events', 'topic', { durable: true });

// RAG Queue: Only work_item events
await channel.bindQueue('rag.index.queue', 'domain.events', 'work_item.*');

// SystemPrompt Queue: Both work_item and system_prompt events
await channel.bindQueue('systemprompt.execute.queue', 'domain.events', 'work_item.*');
await channel.bindQueue('systemprompt.execute.queue', 'domain.events', 'system_prompt.*');
```

**Routing Table**:
| Event | Routing Key | RAG Queue | SystemPrompt Queue |
|-------|-------------|-----------|-------------------|
| Work item created | `work_item.create` | ✅ | ✅ |
| Work item updated | `work_item.update` | ✅ | ✅ |
| Work item deleted | `work_item.delete` | ✅ | ✅ |
| Category updated | `category.update` | ❌ | ❌ |
| System prompt created | `system_prompt.create` | ❌ | ✅ |

**Note**: Category and custom field events are converted to `work_item` events by the domain event dispatcher.

---

## External Services

### **Hippocampus AI**

**Service**: Vector database and semantic search platform

**Base URL**: `https://api.hippocampus.ai`

**Authentication**: API Key (header: `x-api-key`)

**Endpoints Used**:

#### 1. **POST /collection**
Create a new collection for an organization

**Request**:
```json
{
  "name": "org:1",
  "settings": {
    "denseModel": "BAAI/bge-large-en-v1.5",
    "sparseModel": "Qdrant/bm25",
    "rerankerModel": "colbert-ir/colbertv2.0",
    "chunkSize": 1000,
    "chunkOverlap": 100
  }
}
```

**Response**:
```json
{
  "collectionId": "abc123",
  "name": "org:1"
}
```

#### 2. **POST /resource**
Add a document to a collection

**Request**:
```json
{
  "collectionId": "abc123",
  "title": "Login flow",
  "content": "Work Item: Login flow\n\nDescription:\nLogin flow is very slow...",
  "ownerId": "org:1"
}
```

**Response**:
```json
{
  "resourceId": "workItem:8",
  "status": "indexed"
}
```

#### 3. **PUT /resource/:resourceId**
Update an existing document

**Request**:
```json
{
  "title": "Updated Login flow",
  "content": "Work Item: Updated Login flow..."
}
```

#### 4. **DELETE /resource/:resourceId**
Remove a document from the index

**Request**: No body

**Response**: `204 No Content`

#### 5. **POST /search**
Semantic search query

**Request**:
```json
{
  "query": "bugs related to login performance",
  "collectionId": "abc123",
  "ownerId": "org:1",
  "limit": 5,
  "minScore": 0.75
}
```

**Response**:
```json
{
  "results": [
    {
      "resourceId": "workItem:8",
      "score": 0.92
    },
    {
      "resourceId": "workItem:15",
      "score": 0.87
    }
  ]
}
```

---

## Configuration

### **Environment Variables**

```bash
# Hippocampus AI Configuration
HIPPOCAMPUS_API_URL=https://api.hippocampus.ai
HIPPOCAMPUS_API_KEY=your_api_key_here

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/workos
```

### **Queue Configuration**

**Exchange**: `domain.events` (topic)
**Queue**: `rag.index.queue` (durable)
**Binding**: `work_item.*`

---

## Queue System

### **Message Type** (`src/queue/queue.types.ts`)

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

### **Message Flow**

```
Service Layer
     │
     ▼
Domain Event Dispatcher
     │
     ▼
Domain Event Publisher
     │
     ▼
RabbitMQ Exchange (domain.events)
     │
     ▼
RAG Queue (work_item.*)
     │
     ▼
RAG Queue Consumer (transport)
     │
     ▼
RAG Consumer (delegation)
     │
     ▼
RAG Processor (business logic)
     │
     ▼
RAG Client (Hippocampus API)
```

### **Error Handling**

- **Success**: Message acknowledged (`ack`)
- **Failure**: Message nacked without requeue (`nack(msg, false, false)`)
- **Retry**: Handled by Hippocampus client (2 retries with exponential backoff)

---

## Data Models

### **Work Item Document**

```typescript
interface WorkItemDocument {
  workItemId: number;
  title: string;
  content: string;  // Formatted searchable content
}
```

### **Resource Identifier**

Format: `workItem:{id}`

Examples:
- `workItem:8`
- `workItem:123`

### **Owner Identifier**

Format: `org:{orgId}`

Examples:
- `org:1`
- `org:42`

### **Collection Naming**

Format: `org:{orgId}`

Examples:
- `org:1`
- `org:42`

---

## Usage Examples

### **1. Automatic Indexing on Work Item Creation**

```typescript
// In workItems.service.ts
const workItem = await prisma.workItem.create({
  data: { title, description, categoryId, orgId, ... }
});

// Event automatically emitted
await domainEventDispatcher.emit(
  DomainEventDispatcher.workItemEvent(
    'create',
    workItem.id,
    orgId,
    categoryId,
    'user',
    ['title', 'description', 'status']
  )
);

// Flow:
// 1. Event published to RabbitMQ with routing key: work_item.create
// 2. RAG queue receives message
// 3. RAG worker processes message
// 4. Document built from work item data
// 5. Document indexed in Hippocampus
```

### **2. Semantic Search**

```bash
# API Request
curl -X POST http://localhost:3000/api/ai/rag-search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "slow login performance issues",
    "limit": 5,
    "minScore": 0.75
  }'

# Response
{
  "success": true,
  "work_item_ids": [8, 15, 23]
}
```

### **3. Cascading Update on Category Name Change**

```typescript
// In categories.service.ts
await prisma.category.update({
  where: { id: categoryId },
  data: { name: 'New Category Name' }
});

// Event emitted
await domainEventDispatcher.emit(
  DomainEventDispatcher.categoryEvent(
    'update',
    categoryId,
    orgId,
    'user',
    ['name']  // Changed field
  )
);

// Flow:
// 1. Event converted to work_item event type
// 2. RAG processor detects category update
// 3. Fetches all work items in that category
// 4. Re-indexes each work item with new category name
```

### **4. Custom Field Value Update**

```typescript
// In customFields.service.ts
await prisma.customFieldValue.update({
  where: { id: valueId },
  data: { valueText: 'approved' }
});

// Event emitted
await domainEventDispatcher.emit(
  DomainEventDispatcher.customFieldValueEvent(
    'update',
    workItemId,
    orgId,
    categoryId,
    'user',
    ['status']  // Changed custom field
  )
);

// Flow:
// 1. Event published as work_item.update
// 2. RAG processor updates parent work item
// 3. Document rebuilt with new custom field value
// 4. Updated in Hippocampus
```

---

## Performance Considerations

### **Indexing Performance**

- **Single Work Item**: ~200-500ms (includes document building + API call)
- **Cascading Updates**: Sequential processing (can be slow for large categories)
- **Queue Processing**: Asynchronous, doesn't block API responses

### **Search Performance**

- **Query Latency**: ~100-300ms (Hippocampus API)
- **Result Limit**: Default 5, max recommended 50
- **Score Threshold**: Default 0.75 (filters low-quality matches)

### **Optimization Strategies**

1. **Collection Caching**: Reduces API calls for collection lookup
2. **Retry Logic**: Handles transient failures
3. **Selective Indexing**: Only indexes text/boolean custom fields
4. **Async Processing**: Queue-based indexing doesn't block user requests

---

## Monitoring & Debugging

### **Logs**

**RAG Worker Logs**:
```
[RAG Queue Consumer] Received message: work_item create 8
[RAG Consumer] Consuming message: work_item create 8
[RAG Processor] Processing work_item create 8
[RAG] Created collection: org:1 (ID: abc123)
[RAG] Added resource: workItem:8 to collection abc123
[RAG Processor] Indexed work item 8
[RAG Consumer] Successfully processed message: work_item create 8
[RAG Queue Consumer] Message acknowledged
```

**Search Logs**:
```
[RAG] Created collection: org:1 (ID: abc123)
RAG search completed for query: "slow login" - found 3 results
```

### **Common Issues**

**1. API Key Not Configured**:
```
HIPPOCAMPUS_API_KEY not configured - RAG features will be disabled
```
**Solution**: Set `HIPPOCAMPUS_API_KEY` environment variable

**2. Resource Not Found on Update**:
```
[RAG Processor] Resource not found, adding instead
```
**Solution**: Automatic fallback to `addResource` (expected behavior)

**3. Queue Connection Failed**:
```
[RabbitMQ] Connection error: ECONNREFUSED
```
**Solution**: Ensure RabbitMQ is running on configured URL

---

## Testing

### **Manual Testing**

**1. Test Indexing**:
```bash
# Create a work item via API
curl -X POST http://localhost:3000/api/work-items \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Test Item", "categoryId": 1, ...}'

# Check RAG worker logs for indexing confirmation
```

**2. Test Search**:
```bash
# Search for work items
curl -X POST http://localhost:3000/api/ai/rag-search \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "test item", "limit": 5}'
```

**3. Test Cascading Update**:
```bash
# Update category name
curl -X PATCH http://localhost:3000/api/categories/1 \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Updated Category"}'

# Check RAG worker logs for cascading re-indexing
```

---

## Future Enhancements

1. **Batch Indexing**: Process multiple work items in parallel
2. **Incremental Updates**: Only update changed fields instead of full re-index
3. **Search Filters**: Add category, status, priority filters to search
4. **Search Analytics**: Track popular queries and result quality
5. **Custom Embeddings**: Organization-specific embedding models
6. **Multi-language Support**: Support for non-English content

---

## Summary

The RAG system provides powerful semantic search capabilities with:
- ✅ Automatic indexing via event-driven architecture
- ✅ Real-time updates through RabbitMQ queues
- ✅ Cascading updates for related entities
- ✅ Multi-tenant isolation per organization
- ✅ Natural language search API
- ✅ Standalone worker process for scalability

**Key Files**:
- `src/rag/core/rag.client.ts` - Hippocampus API client
- `src/rag/consumer/rag.processor.ts` - Indexing business logic
- `src/rag/rag.consumer.ts` - Search API handler
- `src/workers/rag.worker.bootstrap.ts` - Worker process
- `src/routes/rag.route.ts` - API endpoint

**External Dependencies**:
- Hippocampus AI (https://api.hippocampus.ai)
- RabbitMQ (Message queue)
- PostgreSQL (Data source)

---

**Last Updated**: February 4, 2026  
**Version**: 2.0  
**Maintainer**: Work Management System Team
