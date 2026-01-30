# RAG System Documentation

## Overview

The RAG (Retrieval-Augmented Generation) system in WorkOS provides semantic search capabilities for work items. It integrates with **Hippocampus AI** to enable natural language queries over work item content, allowing users to find relevant tasks based on meaning rather than exact keyword matches.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RAG System Flow                          │
└─────────────────────────────────────────────────────────────┘

Work Item CRUD
     │
     ├─→ SQL Mutation Event
     │        │
     │        ├─→ Event Logger (logs to event_logs table)
     │        │
     │        └─→ RAG Producer (async processing)
     │                 │
     │                 ├─→ Document Builder (formats work item)
     │                 │
     │                 └─→ RAG Client (Hippocampus API)
     │                          │
     │                          └─→ Vector Database (embeddings)
     │
     └─→ User Search Query
              │
              └─→ RAG Consumer (search endpoint)
                       │
                       ├─→ RAG Client (semantic search)
                       │
                       └─→ Returns work_item_ids
```

## Components

### 1. RAG Client (`rag.client.ts`)

**Purpose**: HTTP client for Hippocampus AI API

**Key Features**:
- Collection management (create, cache)
- Resource CRUD (add, update, delete)
- Semantic search with scoring
- Retry logic with exponential backoff
- Error handling and logging

**Configuration**:
```typescript
HIPPOCAMPUS_API_URL=https://api.hippocampus.ai
HIPPOCAMPUS_API_KEY=your_api_key_here
```

**Methods**:

#### `createCollection(orgId: string): Promise<string>`
Creates or retrieves a collection for an organization.

- **Collection Name**: `org:{orgId}`
- **Settings**:
  - Dense Model: `BAAI/bge-large-en-v1.5` (semantic embeddings)
  - Sparse Model: `Qdrant/bm25` (keyword matching)
  - Reranker Model: `colbert-ir/colbertv2.0` (result reranking)
  - Chunk Size: 1000 characters
  - Chunk Overlap: 100 characters
- **Caching**: Collection IDs are cached in-memory to avoid redundant API calls
- **Idempotency**: Handles "already exists" errors gracefully

#### `addResource(collectionId, resourceId, title, content, ownerId): Promise<void>`
Adds a new work item document to the vector database.

- **Resource ID Format**: `workItem:{id}`
- **Owner ID Format**: `org:{orgId}`
- **Content**: Formatted document with all work item details

#### `updateResource(resourceId, title, content): Promise<void>`
Updates an existing work item document in the vector database.

- Used when work item content changes (title, description, custom fields)
- Preserves resource ID and ownership

#### `deleteResource(resourceId): Promise<void>`
Removes a work item document from the vector database.

- Called when work item is deleted
- Fails silently if resource doesn't exist

#### `query(collectionId, queryText, ownerId, limit, minScore): Promise<RagQueryResult[]>`
Performs semantic search over work items.

- **Query Text**: Natural language search query
- **Limit**: Maximum number of results (default: 5)
- **Min Score**: Minimum relevance score (default: 0.75)
- **Returns**: Array of `{resourceId, score}` objects

**Error Handling**:
- Retries failed requests up to 2 times
- Exponential backoff: 1s, 2s delays
- Throws `RAG service unavailable` after all retries fail

---

### 2. RAG Document Builder (`rag.document.builder.ts`)

**Purpose**: Converts work items into searchable text documents

**Document Format**:
```
Work Item: {title}

Description:
{description}

Category:
{category_name}

Status:
{status}

Priority:
{priority}

Custom Fields:
- {field_name} ({field_description}): {value}
- {field_name}: {value}
```

**Methods**:

#### `buildDocument(workItemId: bigint): Promise<WorkItemDocument | null>`
Builds a complete searchable document for a work item.

**SQL Queries**:
1. **Work Item Query**:
```sql
SELECT 
  wi.id,
  wi.title,
  wi.description,
  wi.status,
  wi.priority,
  c.name as category_name
FROM work_items wi
LEFT JOIN categories c ON c.id = wi.category_id
WHERE wi.id = {workItemId}
LIMIT 1
```

2. **Custom Fields Query**:
```sql
SELECT 
  cfmd.name as field_name,
  cfmd.description as field_description,
  cfmd.data_type,
  cfv.value_text,
  cfv.value_number,
  cfv.value_boolean
FROM custom_field_values cfv
JOIN custom_field_meta_data cfmd ON cfmd.id = cfv.custom_field_meta_data_id
WHERE cfv.work_item_id = {workItemId}
  AND cfmd.data_type IN ('text', 'boolean')
ORDER BY cfmd.name ASC
```

**Returns**:
```typescript
{
  workItemId: bigint,
  title: string,
  content: string  // Formatted document
}
```

#### `formatDocument(workItem, customFields): string`
Formats work item data into a structured text document.

- Includes all relevant fields
- Adds field descriptions for custom fields (provides context)
- Skips empty/null values
- Returns clean, readable text

#### `extractFieldValue(field): string | null`
Extracts the appropriate value based on field data type.

- **Text fields**: Returns `value_text`
- **Boolean fields**: Returns "Yes" or "No"
- **Number fields**: Currently not included (can be added)
- **JSON fields**: Currently not included (can be added)

**Why Custom Field Descriptions Matter**:
Including field descriptions in the document provides semantic context. For example:
- Without description: `"Estimated Hours: 8"`
- With description: `"Estimated Hours (Time required to complete): 8"`

This helps the AI understand the meaning of custom fields during semantic search.

---

### 3. RAG Producer (`rag.producer.ts`)

**Purpose**: Asynchronously indexes work items into the vector database

**Event-Driven Architecture**:
The producer listens to mutation events from the SQL execution service and automatically updates the RAG index.

**Methods**:

#### `handleEvent(event: MutationEvent): Promise<void>`
Main event handler that routes events to appropriate methods.

**Event Structure**:
```typescript
{
  entity_type: 'work_item',
  entity_id: number,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  sql: string
}
```

**Event Routing**:
- `CREATE` → `indexWorkItem()` - Add to vector DB
- `UPDATE` → `updateWorkItem()` - Update in vector DB (if relevant)
- `DELETE` → `deleteWorkItem()` - Remove from vector DB

#### `indexWorkItem(workItemId, sql): Promise<void>`
Indexes a newly created work item.

**Process**:
1. Extract `org_id` from work item's category
2. Create/get collection for organization
3. Build searchable document
4. Add resource to Hippocampus with:
   - Resource ID: `workItem:{id}`
   - Owner ID: `org:{orgId}`
   - Title: Work item title
   - Content: Formatted document

#### `updateWorkItem(workItemId, sql): Promise<void>`
Updates an existing work item in the vector database.

**Smart Update Logic**:
Only updates RAG if the SQL mutation affects searchable content:
- Title changes
- Description changes
- Category changes
- Custom field text/boolean values
- Status changes to/from ARCHIVED

**Fallback Behavior**:
If resource doesn't exist (e.g., was created before RAG was enabled), it automatically adds it instead of updating.

#### `deleteWorkItem(workItemId): Promise<void>`
Removes a work item from the vector database.

- Simple deletion by resource ID
- Fails silently if resource doesn't exist

#### `shouldUpdateRag(sql): boolean`
Determines if a SQL mutation affects searchable content.

**Checks for**:
- `title` column
- `description` column
- `category_id` column
- `value_text` column (custom fields)
- `value_boolean` column (custom fields)
- `status` changes involving ARCHIVED

**Why This Matters**:
Prevents unnecessary RAG updates for non-content changes like:
- `assignee_id` updates
- `priority` changes (unless you want to search by priority)
- `start_date` / `due_date` changes
- Numeric custom field updates

This reduces API calls and improves performance.

#### `extractOrgId(workItemId): Promise<string | null>`
Extracts the organization ID for a work item.

**SQL Query**:
```sql
SELECT c.org_id
FROM work_items wi
JOIN categories c ON c.id = wi.category_id
WHERE wi.id = {workItemId}
LIMIT 1
```

**Why Needed**:
- Collections are scoped per organization
- Owner ID must match organization for access control

---

### 4. RAG Consumer (`rag.consumer.ts`)

**Purpose**: HTTP endpoint for semantic search

**Endpoint**: `POST /rag/search`

**Request Body**:
```json
{
  "query": "string (required)",
  "limit": "number (optional, default: 5)",
  "minScore": "number (optional, default: 0.75)"
}
```

**Response**:
```json
{
  "success": true,
  "work_item_ids": [1, 5, 12]
}
```

**Authentication**:
Requires `req.user.org_id` from mock auth middleware.

**Process**:
1. Validate query string
2. Check authentication
3. Get/create collection for user's organization
4. Perform semantic search via RAG client
5. Extract work item IDs from resource IDs
6. Return sorted by relevance score

**Resource ID Parsing**:
```typescript
// Resource ID format: "workItem:123"
const match = r.resourceId.match(/^workItem:(\d+)$/);
const workItemId = match ? parseInt(match[1], 10) : null;
```

**Error Handling**:
- 400: Invalid query
- 401: Missing authentication
- 500: RAG service failure
- Empty results: Returns `work_item_ids: []`

---

## Data Flow Examples

### Example 1: Creating a Work Item

```
1. User/AI executes SQL:
   INSERT INTO work_items (category_id, title, description, status)
   VALUES (1, 'Fix login bug', 'Users cannot login', 'CAPTURED')

2. SQL Service logs mutation event:
   {
     entity_type: 'work_item',
     entity_id: 42,
     action: 'CREATE',
     sql: 'INSERT INTO work_items...'
   }

3. RAG Producer receives event:
   - Extracts org_id from category
   - Creates/gets collection "org:org_demo"
   - Builds document:
     ```
     Work Item: Fix login bug
     
     Description:
     Users cannot login
     
     Category:
     Bug Reports
     
     Status:
     CAPTURED
     ```
   - Sends to Hippocampus API
   - Resource indexed as "workItem:42"

4. Work item is now searchable via RAG
```

### Example 2: Searching Work Items

```
1. User searches: "authentication problems"

2. Frontend calls: POST /rag/search
   {
     "query": "authentication problems",
     "limit": 5,
     "minScore": 0.75
   }

3. RAG Consumer:
   - Gets collection for user's org
   - Calls Hippocampus semantic search
   - Receives results:
     [
       { resourceId: "workItem:42", score: 0.89 },
       { resourceId: "workItem:15", score: 0.81 }
     ]
   - Extracts IDs: [42, 15]
   - Returns: { success: true, work_item_ids: [42, 15] }

4. Frontend fetches work items 42 and 15
   - Displays "Fix login bug" (score: 0.89)
   - Displays "Add 2FA authentication" (score: 0.81)
```

### Example 3: Updating Work Item Description

```
1. User/AI executes SQL:
   UPDATE work_items 
   SET description = 'Users get 401 error on login endpoint'
   WHERE id = 42

2. SQL Service logs mutation event:
   {
     entity_type: 'work_item',
     entity_id: 42,
     action: 'UPDATE',
     sql: 'UPDATE work_items SET description...'
   }

3. RAG Producer:
   - Checks shouldUpdateRag(sql) → true (contains 'description')
   - Rebuilds document with new description
   - Updates resource "workItem:42" in Hippocampus
   - Vector embeddings updated

4. Future searches for "401 error" now find this work item
```

---

## Configuration

### Environment Variables

```bash
# Required for RAG functionality
HIPPOCAMPUS_API_URL=https://api.hippocampus.ai
HIPPOCAMPUS_API_KEY=your_api_key_here

# Database connection (required)
DATABASE_URL=postgresql://...
```

### Hippocampus Models

The system uses a hybrid search approach:

1. **Dense Embeddings** (`BAAI/bge-large-en-v1.5`)
   - Captures semantic meaning
   - Good for: "authentication issues" → "login problems"

2. **Sparse Embeddings** (`Qdrant/bm25`)
   - Keyword-based matching
   - Good for: exact terms, IDs, specific phrases

3. **Reranker** (`colbert-ir/colbertv2.0`)
   - Re-scores results for better relevance
   - Combines dense + sparse signals

### Chunking Strategy

- **Chunk Size**: 1000 characters
- **Overlap**: 100 characters
- **Why**: Work items are typically small documents, so chunking mainly helps with very long descriptions

---

## Integration Points

### 1. Event Logger Integration

The RAG system is triggered by the Event Logger:

```typescript
// In sql.service.ts
await this.eventLogger.logMutation(sql, result);
```

The Event Logger:
1. Logs mutation to `event_logs` table
2. Extracts entity type and ID from SQL
3. Calls RAG Producer asynchronously
4. Does not block SQL execution

### 2. SQL Service Integration

```typescript
// In sql.service.ts - executeMutation()
const result = await prisma.$executeRawUnsafe(sql);
await this.eventLogger.logMutation(sql, result);
// RAG indexing happens asynchronously
```

### 3. API Routes

```typescript
// In main router
app.post('/rag/search', ragSearch);
```

---

## Performance Considerations

### Caching
- Collection IDs are cached in-memory
- Reduces API calls to Hippocampus
- Cache is per-instance (resets on server restart)

### Async Processing
- RAG indexing is asynchronous
- Does not block SQL mutations
- Failures are logged but don't affect user operations

### Selective Updates
- `shouldUpdateRag()` prevents unnecessary updates
- Only indexes content-related changes
- Reduces API usage and costs

### Retry Logic
- 2 retries with exponential backoff
- Handles transient network failures
- Prevents data loss from temporary issues

---

## Error Handling

### Graceful Degradation
If RAG service is unavailable:
- SQL mutations still succeed
- Search endpoint returns empty results
- Logs errors but doesn't crash

### Missing API Key
```typescript
if (!this.apiKey) {
  console.warn('HIPPOCAMPUS_API_KEY not configured - RAG features will be disabled');
}
```

### Document Build Failures
- Returns `null` if work item not found
- Logs error and continues
- Doesn't block other operations

---

## Future Enhancements

### Potential Improvements

1. **Include Number Fields**
   - Add `value_number` to searchable content
   - Enable queries like "tasks over 8 hours"

2. **Include JSON Fields**
   - Parse and index JSON custom fields
   - Search within structured data

3. **Parent/Child Relationships**
   - Index work item hierarchy
   - Search across related items

4. **Metadata Filtering**
   - Filter by status, priority, category before search
   - Combine SQL filters with semantic search

5. **Batch Indexing**
   - Bulk index existing work items
   - Initial setup for new organizations

6. **Real-time Updates**
   - WebSocket notifications when RAG indexing completes
   - Show "indexing..." status in UI

7. **Analytics**
   - Track search queries
   - Measure result relevance
   - Optimize scoring thresholds

---

## Testing

### Manual Testing

1. **Create a work item**:
```sql
INSERT INTO work_items (category_id, title, description, status)
VALUES (1, 'Implement dark mode', 'Add dark theme support', 'CAPTURED');
```

2. **Wait 1-2 seconds** for async indexing

3. **Search**:
```bash
curl -X POST http://localhost:3000/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "dark theme", "limit": 5}'
```

4. **Verify** work item ID is returned

### Integration Testing

```typescript
// Test RAG flow
const workItemId = await createWorkItem({
  title: 'Test RAG indexing',
  description: 'This is a test document'
});

await sleep(2000); // Wait for async indexing

const results = await ragSearch({
  query: 'test document',
  limit: 5
});

expect(results.work_item_ids).toContain(workItemId);
```

---

## Troubleshooting

### Work items not appearing in search

**Check**:
1. Is `HIPPOCAMPUS_API_KEY` configured?
2. Are mutation events being logged? (check `event_logs` table)
3. Check backend logs for RAG errors
4. Verify collection was created (check logs for "Created collection")

### Low search relevance

**Solutions**:
1. Lower `minScore` threshold (try 0.5 instead of 0.75)
2. Increase `limit` to see more results
3. Check if work item content is detailed enough
4. Verify custom field descriptions are meaningful

### API rate limits

**Solutions**:
1. Implement request queuing
2. Batch updates where possible
3. Increase `shouldUpdateRag()` selectivity
4. Cache search results client-side

---

## Security Considerations

### Organization Isolation
- Collections are scoped per organization
- Owner ID enforces access control
- Search results filtered by `org_id`

### SQL Injection Prevention
- Uses parameterized queries via Prisma
- Work item IDs are validated as numbers
- No user input directly in SQL

### API Key Security
- Stored in environment variables
- Never exposed to frontend
- Transmitted over HTTPS only

---

## Conclusion

The RAG system provides powerful semantic search capabilities for WorkOS, enabling users to find work items using natural language queries. It operates asynchronously to avoid blocking critical operations and gracefully degrades when unavailable.

**Key Benefits**:
- Natural language search
- Automatic indexing on CRUD operations
- Organization-scoped collections
- Hybrid search (semantic + keyword)
- Resilient error handling

**Integration Points**:
- Event Logger → RAG Producer (indexing)
- API Endpoint → RAG Consumer (search)
- Document Builder → Searchable content

This system is designed to scale with the application and can be extended with additional features as needed.
