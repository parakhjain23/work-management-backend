# PHASE 6: Hippocampus RAG (Organizational Memory Layer)

## Overview

PHASE 6 introduces a semantic memory layer using Hippocampus RAG APIs. This enables the AI to recall similar past work, answer historical questions, and support "have we done this before?" queries.

**Critical Principle**: RAG is NOT a source of truth. SQL remains authoritative.

## Architecture

### Collection Strategy

- **Collection = Organization**
  - `collection_id = "org:{org_id}"`
  - One collection per organization
  - No per-category or per-user collections

- **Resource = Work Item**
  - `resource_id = "workItem:{work_item_id}"`
  - Each work item is a separate resource
  - Resources are indexed as natural language documents

### RAG vs SQL

**RAG is for**:
- Historical queries ("Have we seen this before?")
- Similarity searches ("Find similar incidents")
- Reflective questions ("What patterns exist?")
- Semantic understanding

**SQL is for**:
- Factual queries ("What is the status?")
- Ownership queries ("Who owns this?")
- Reporting ("How many items?")
- Precise filtering

**For mixed queries**: AI decides order (RAG → SQL OR SQL → RAG)

## Document Format

Each work item is embedded as a natural language document:

```
Work Item: Customer says app is slow on mobile

Description:
Customer reported that the mobile app takes 5+ seconds to load
the dashboard. This is affecting user retention.

Category:
Bug Reports

Status:
IN_PROGRESS

Priority:
HIGH

Custom Fields:
- Severity: Critical
- Platform: iOS
- Reproducible: Yes
```

### Document Rules

**Include**:
- Title (always)
- Description (if present)
- Category name (if present)
- Status (always)
- Priority (if present)
- Meaningful custom fields (text, enum-like values)

**Exclude**:
- Numeric-only fields
- IDs and timestamps
- Logs and audit trails
- JSON blobs

## RAG Producer (Indexing)

### When to Index

**ADD/UPDATE resource when**:
- work_item CREATED
- title changed
- description changed
- category changed
- meaningful custom field (text/enum) changed

**DO NOT update for**:
- status-only change
- assignee change
- priority-only change
- numeric-only field updates

**DELETE resource when**:
- work_item status = ARCHIVED

### Implementation

The RAG producer runs asynchronously after events:

```typescript
// Event occurs
work_item CREATED

// Event logger triggers
await ragProducer.handleEvent(event)

// Producer decides
if (shouldIndex(event)) {
  // Build document
  const content = await builder.buildDocument(workItemId)
  
  // Index in RAG
  await client.addResource(orgId, resourceId, content)
}
```

**Failure Handling**:
- Failures are logged, not retried infinitely
- RAG failures do not block mutations
- System continues to function without RAG

## RAG Consumer (Search)

### API Endpoint

**POST /ai/rag-search**

**Request**:
```json
{
  "query": "Have we seen similar performance issues before?",
  "limit": 5
}
```

**Response**:
```json
{
  "success": true,
  "work_item_ids": [123, 456, 789]
}
```

**Returns**:
- Array of work_item_ids only
- No text snippets
- No summaries
- AI must query SQL for details

### Usage Pattern

```
User: "Have we seen similar login bugs before?"

AI:
1. Calls rag_search with query
2. Receives work_item_ids: [45, 67, 89]
3. Calls execute_sql to fetch details:
   SELECT * FROM work_items WHERE id IN (45, 67, 89)
4. Presents results to user
```

## GTWY Tool Configuration

Expose ONE tool to GTWY:

**Tool**: `rag_search`
**Endpoint**: `POST /ai/rag-search`

**Contract**:
- Input: natural language query (string)
- Output: array of work_item_ids (numbers)

**AI may call this tool multiple times** in a conversation.

## Implementation Components

### rag.client.ts

**Responsibilities**:
- Wrap Hippocampus HTTP APIs
- Handle authentication
- Retry failed requests (max 2 retries)
- Return clean responses

**Methods**:
- `createCollection(orgId)` - Create org collection
- `addResource(orgId, resourceId, content)` - Add work item
- `updateResource(orgId, resourceId, content)` - Update work item
- `deleteResource(orgId, resourceId)` - Remove work item
- `query(orgId, queryText, limit)` - Semantic search

**Error Handling**:
- Never expose raw HTTP errors
- Log failures for debugging
- Return user-safe error messages

### rag.document.builder.ts

**Responsibilities**:
- Fetch work_item + category + custom fields via SQL
- Build exact document string format
- Sanitize empty/null values
- Ensure stable ordering of custom fields

**Deterministic Behavior**:
- Same work item → same document (always)
- Stable field ordering
- Consistent formatting

### rag.producer.ts

**Responsibilities**:
- Listen to internal events
- Decide whether RAG update is required
- Call document builder
- Call RAG client add/update

**Async Execution**:
- Runs after mutation completes
- Does not block user operations
- Failures are logged, not retried infinitely

### rag.consumer.ts

**Responsibilities**:
- Implement semantic search endpoint
- Validate input
- Call RAG client
- Extract work_item_ids from results
- Return structured response

## Security & Isolation

### Organization Scoping

- Collections are org-scoped: `org:{org_id}`
- Never query across organizations
- User's org_id from `req.user.org_id`

### Data Protection

- Never leak raw embeddings
- Never store sensitive secrets in content
- Never expose internal RAG structure

### Authentication

- RAG search requires authentication
- Same auth middleware as other endpoints
- 401 if not authenticated

## Configuration

### Environment Variables

```bash
HIPPOCAMPUS_API_URL=https://api.hippocampus.ai
HIPPOCAMPUS_API_KEY=your_hippocampus_api_key_here
```

### API Key Security

- Store in environment variables
- Never commit to version control
- Never expose to frontend
- Use different keys per environment

## Testing Scenarios

### Test 1: Collection Creation
```typescript
// Create work item in org "acme"
INSERT INTO work_items (...) VALUES (...)

// Expected: Collection "org:acme" created (if not exists)
// Expected: Resource "workItem:123" added
```

### Test 2: Document Update
```typescript
// Update work item description
UPDATE work_items SET description = 'New description' WHERE id = 123

// Expected: Resource "workItem:123" updated in RAG
```

### Test 3: Status-Only Change (No RAG Update)
```typescript
// Update only status
UPDATE work_items SET status = 'IN_PROGRESS' WHERE id = 123

// Expected: RAG NOT updated (status-only change)
```

### Test 4: Semantic Search
```typescript
POST /ai/rag-search
{
  "query": "login issues on mobile",
  "limit": 5
}

// Expected: Returns work_item_ids of similar items
// Expected: Irrelevant items NOT returned
```

### Test 5: Archived Item Exclusion
```typescript
// Archive work item
UPDATE work_items SET status = 'ARCHIVED' WHERE id = 123

// Expected: Resource "workItem:123" deleted from RAG
```

## AI Usage Patterns

### Pattern 1: Historical Search

```
User: "Have we seen payment gateway timeouts before?"

AI:
1. rag_search("payment gateway timeout")
2. Receives: [45, 67, 89]
3. execute_sql("SELECT * FROM work_items WHERE id IN (45,67,89)")
4. Presents: "Yes, we've had 3 similar issues..."
```

### Pattern 2: Similarity-Based Triage

```
User: "Customer says checkout is broken"

AI:
1. rag_search("checkout broken customer issue")
2. Receives: [12, 34]
3. execute_sql("SELECT category_id FROM work_items WHERE id IN (12,34)")
4. Suggests: "This looks similar to items in 'Payment Issues' category"
```

### Pattern 3: Pattern Recognition

```
User: "What patterns do we see in mobile bugs?"

AI:
1. rag_search("mobile bugs issues")
2. Receives: [10, 20, 30, 40, 50]
3. execute_sql("SELECT platform, COUNT(*) FROM custom_field_values...")
4. Analyzes: "Most mobile bugs are on iOS, affecting login flow"
```

## Limitations & Boundaries

### What RAG Cannot Do

- ❌ Provide real-time status (use SQL)
- ❌ Guarantee factual accuracy (verify with SQL)
- ❌ Return exact counts (use SQL)
- ❌ Enforce permissions (backend does this)
- ❌ Trigger mutations (read-only)

### What RAG Can Do

- ✅ Find semantically similar work
- ✅ Answer "have we seen this before?"
- ✅ Support exploratory queries
- ✅ Provide historical context
- ✅ Enable pattern discovery

## Performance Considerations

### Indexing

- Async (non-blocking)
- Batched updates possible
- Failures don't cascade
- No impact on mutation latency

### Search

- Fast semantic search
- Configurable result limit
- Org-scoped (efficient)
- No cross-org queries

## Observability

### Logging

All RAG operations are logged:
- `[RAG] Created collection: org:acme`
- `[RAG] Added resource: workItem:123 to org:acme`
- `[RAG] Updated resource: workItem:123 in org:acme`
- `[RAG] Deleted resource: workItem:123 from org:acme`

### Error Tracking

- Failed API calls logged with details
- Retry attempts tracked
- User-safe error messages returned

## Integration with Previous Phases

### Phase 2: SQL Execution
- RAG search returns work_item_ids
- AI uses execute_sql to fetch details
- SQL remains source of truth

### Phase 3: Conversation Scoping
- RAG search respects org_id from threadId
- Global chat can search across org
- Work-item chat can search for similar items

### Phase 4: Invariants
- RAG indexing does not bypass invariants
- RAG is read-only from AI perspective
- No mutations via RAG

### Phase 5: System Prompts
- System prompts can use rag_search
- RAG provides context for automation
- Prompts verify with SQL before acting

## Future Enhancements

Possible additions (not in this phase):
- Multi-modal embeddings (images, files)
- Custom field weighting
- Time-based relevance decay
- User feedback on search quality
- Analytics on search patterns

## Summary

PHASE 6 adds:
- ✅ Semantic memory layer (Hippocampus RAG)
- ✅ Automatic work item indexing
- ✅ Semantic search endpoint
- ✅ Org-scoped collections
- ✅ Natural language document format
- ✅ Read-only AI access
- ✅ SQL verification pattern

**The system now has**:
- 🧠 Memory (RAG)
- 🧾 Truth (SQL)
- 🧑 Identity (JWT + threads)
- 🛡 Authority (backend)

This is the correct architecture for an AI-first system.
