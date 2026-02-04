# GTWY RAG Migration Guide

## Overview

This document describes the migration from Hippocampus RAG APIs to GTWY RAG APIs. The migration was performed as a **safe integration-layer swap** without breaking any existing architecture.

---

## What Changed

### **Replaced Components**

1. **RAG Client**: `rag.client.ts` → `rag.client.gtwy.ts`
2. **Document Builder**: Added `rag.document.builder.gtwy.ts` (includes `description` field)
3. **RAG Processor**: Updated to use GTWY client and manage `docId` in database
4. **Search Handler**: Updated to query by `docId` instead of `resourceId`

### **What Did NOT Change**

✅ Event dispatcher  
✅ Queue logic  
✅ Worker bootstrap  
✅ Domain event structure  
✅ System prompt logic  
✅ Service layer  
✅ API controllers  
✅ RabbitMQ configuration  

---

## Architecture Comparison

### **Before (Hippocampus)**

```
Work Item Event → RAG Processor → Hippocampus API
                                   ↓
                          resourceId: workItem:123
                          collectionId: per org
                          ownerId: org:1
```

### **After (GTWY)**

```
Work Item Event → RAG Processor → GTWY API
                                   ↓
                          docId: <uuid> (saved in work_items.doc_id)
                          collection_id: static (from ENV)
                          owner_id: orgId
```

---

## Key Differences

| Feature | Hippocampus | GTWY |
|---------|-------------|------|
| **Collection** | Per organization | Single static collection |
| **Resource ID** | `workItem:123` | UUID/doc_id |
| **Storage** | Not stored in DB | Stored in `work_items.doc_id` |
| **Owner ID** | `org:1` | `1` (orgId as string) |
| **Document Fields** | title, content | title, description, content |
| **Chunking** | Fixed settings | Configurable strategy |

---

## Environment Variables

### **Required Configuration**

Add to `.env`:

```bash
# GTWY RAG Configuration
GTWY_RAG_API_URL=https://db.gtwy.ai
GTWY_RAG_QUERY_URL=https://api.gtwy.ai
GTWY_RAG_AUTH_TOKEN=<your_auth_token>
GTWY_RAG_COLLECTION_ID=<your_collection_id>
GTWY_RAG_COLLECTION_MODE=moderate
```

### **Collection Modes**

- `fastest`: Lowest latency, best for quick responses
- `moderate`: Balanced speed and accuracy (default)
- `high_accuracy`: More processing, best for complex queries

---

## Database Schema

### **work_items.doc_id Column**

The `doc_id` column stores the GTWY document ID:

```sql
-- Already exists in schema
doc_id VARCHAR(255) NULL
```

**Values**:
- `NULL`: Not yet indexed
- `workItem:123`: Legacy Hippocampus ID (auto-migrated on update)
- `<uuid>`: GTWY document ID

---

## Migration Behavior

### **Automatic Legacy Migration**

When a work item with a legacy `docId` (format: `workItem:123`) is updated:

1. Detect legacy format
2. Create new resource in GTWY
3. Update `doc_id` with new GTWY doc_id
4. Log migration

**Example Log**:
```
[RAG Processor] Legacy docId detected: workItem:8, recreating in GTWY
[RAG Processor] Migrated work item 8 from legacy to GTWY docId: abc-123-def
```

### **Idempotency**

On work item creation:
- Check if `doc_id` already exists
- Skip creation if docId present
- Prevents duplicate indexing

---

## API Changes

### **Create Resource**

**Endpoint**: `POST https://db.gtwy.ai/api/rag/resource`

**Request**:
```json
{
  "title": "Login flow",
  "description": "Login flow is very slow.",
  "content": "Work Item: Login flow\n\nDescription:\nLogin flow is very slow...",
  "settings": {
    "strategy": "recursive",
    "chunkSize": 4000
  },
  "collection_details": "moderate",
  "owner_id": "1"
}
```

**Response**:
```json
{
  "success": true,
  "doc_id": "abc-123-def-456"
}
```

### **Update Resource**

**Endpoint**: `PUT https://db.gtwy.ai/api/rag/resource/{doc_id}`

**Request**:
```json
{
  "title": "Updated Login flow",
  "description": "Updated description",
  "content": "Updated content..."
}
```

### **Delete Resource**

**Endpoint**: `DELETE https://db.gtwy.ai/api/rag/resource/{doc_id}`

### **Query**

**Endpoint**: `POST https://api.gtwy.ai/rag/query`

**Request**:
```json
{
  "collection_id": "your_collection_id",
  "owner_id": "1",
  "query": "bugs related to login performance"
}
```

**Response**:
```json
{
  "results": [
    {
      "doc_id": "abc-123-def",
      "score": 0.92
    }
  ]
}
```

---

## Event Flow (Unchanged)

```
Service Layer
     ↓
Domain Event Dispatcher
     ↓
RabbitMQ Publisher
     ↓
RabbitMQ Exchange (domain.events)
     ↓
RAG Queue (work_item)
     ↓
RAG Worker
     ↓
RAG Processor (GTWY client) ← ONLY THIS CHANGED
     ↓
GTWY API
```

---

## Search Flow Changes

### **Before (Hippocampus)**

```typescript
1. Query Hippocampus API
2. Get results with resourceId: workItem:123
3. Extract work item ID from resourceId
4. Return work_item_ids
```

### **After (GTWY)**

```typescript
1. Query GTWY API with owner_id
2. Get results with doc_id
3. Query database: SELECT id FROM work_items WHERE doc_id IN (...)
4. Return work_item_ids
```

**Key Difference**: Database lookup by `doc_id` ensures only valid, existing work items are returned.

---

## Testing

### **1. Test Work Item Creation**

```bash
# Create work item
curl -X POST http://localhost:3000/api/work-items \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Test Item", "categoryId": 1, ...}'

# Check RAG worker logs
[RAG Processor] Indexed work item 123 with docId: abc-123-def

# Verify database
SELECT id, doc_id FROM work_items WHERE id = 123;
```

### **2. Test Work Item Update**

```bash
# Update work item
curl -X PATCH http://localhost:3000/api/work-items/123 \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Updated Title"}'

# Check RAG worker logs
[RAG Processor] Updated work item 123 with docId: abc-123-def
```

### **3. Test Search**

```bash
# Search
curl -X POST http://localhost:3000/api/ai/rag-search \
  -H "Authorization: Bearer <token>" \
  -d '{"query": "test item", "limit": 5}'

# Response
{
  "success": true,
  "work_item_ids": [123, 124]
}
```

### **4. Test Legacy Migration**

```bash
# Manually set legacy docId
UPDATE work_items SET doc_id = 'workItem:123' WHERE id = 123;

# Update work item (triggers migration)
curl -X PATCH http://localhost:3000/api/work-items/123 \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "Trigger Migration"}'

# Check logs
[RAG Processor] Legacy docId detected: workItem:123, recreating in GTWY
[RAG Processor] Migrated work item 123 from legacy to GTWY docId: xyz-789

# Verify database
SELECT doc_id FROM work_items WHERE id = 123;
-- Result: xyz-789 (new GTWY docId)
```

---

## Multi-Tenant Isolation

### **Before (Hippocampus)**
- Each organization had its own collection
- `collectionId` = per org
- `ownerId` = `org:1`

### **After (GTWY)**
- Single static collection for all organizations
- `collection_id` = static (from ENV)
- `owner_id` = orgId (string)

**Isolation Enforcement**:
- All queries include `owner_id`
- Database queries filter by `org_id`
- Cross-org search is impossible

---

## Error Handling

### **Create/Update Failures**

```typescript
try {
  const docId = await client.createResource(...);
  await prisma.$executeRawUnsafe(`UPDATE work_items SET doc_id = '${docId}' ...`);
} catch (error) {
  console.error('[RAG Processor] Failed to create work item:', error);
  // Don't throw - allow worker to continue
}
```

### **Delete Failures**

```typescript
try {
  await client.deleteResource(docId);
} catch (error) {
  console.error('[RAG Processor] Failed to delete resource:', error);
  // Don't throw - deletion failures should not crash worker
}
```

### **Search Failures**

```typescript
try {
  const results = await client.query(...);
  // Process results
} catch (error) {
  console.error('RAG search error:', error);
  res.status(500).json({ success: false, error: 'RAG search failed' });
}
```

---

## Rollback Plan

If issues arise, rollback is simple:

1. **Revert code changes**:
   ```bash
   git revert <commit_hash>
   ```

2. **Update environment variables**:
   ```bash
   # Restore Hippocampus config
   HIPPOCAMPUS_API_URL=https://api.hippocampus.ai
   HIPPOCAMPUS_API_KEY=<key>
   ```

3. **Restart services**:
   ```bash
   npm run worker:rag
   npm run dev
   ```

4. **Clear docId column** (optional):
   ```sql
   UPDATE work_items SET doc_id = NULL;
   ```

---

## Performance Considerations

### **Database Queries**

- `doc_id` column should be indexed for fast lookups
- Consider adding index:
  ```sql
  CREATE INDEX idx_work_items_doc_id ON work_items(doc_id);
  ```

### **API Latency**

- GTWY API latency: ~100-300ms
- Database lookup: ~10-50ms
- Total search time: ~150-400ms

### **Chunking Strategy**

- `recursive`: Best for structured documents (default)
- `semantic`: Best for narrative content
- `agentic`: AI-driven chunking

---

## Monitoring

### **Key Metrics**

1. **Indexing Success Rate**
   - Monitor logs for failed creates/updates
   - Alert on high failure rate

2. **docId Coverage**
   - Query: `SELECT COUNT(*) FROM work_items WHERE doc_id IS NULL`
   - Target: < 5% NULL docIds

3. **Search Performance**
   - Monitor API response times
   - Alert on > 500ms latency

4. **Legacy Migration Progress**
   - Query: `SELECT COUNT(*) FROM work_items WHERE doc_id LIKE 'workItem:%'`
   - Target: 0 legacy docIds

---

## FAQ

### **Q: What happens to existing Hippocampus data?**
A: It remains in Hippocampus but is no longer used. Legacy docIds are auto-migrated on first update.

### **Q: Can I manually migrate all work items?**
A: Yes, trigger updates for all work items or run a migration script.

### **Q: What if GTWY API is down?**
A: Worker logs errors but continues processing. Indexing will fail but API remains functional.

### **Q: How do I verify migration success?**
A: Check that new work items have GTWY docIds (not `workItem:` format) and search returns correct results.

### **Q: Can I use multiple collections?**
A: Currently, the system uses a single static collection. Multi-collection support requires code changes.

---

## Summary

✅ **Migration Complete**  
✅ **No Breaking Changes**  
✅ **Event System Intact**  
✅ **Queue System Intact**  
✅ **API Layer Unchanged**  
✅ **Multi-Tenant Isolation Preserved**  
✅ **Legacy Migration Automatic**  

The RAG system now uses GTWY APIs with improved document management via `docId` storage in the database.

---

**Last Updated**: February 4, 2026  
**Version**: 1.0  
**Migration Status**: Complete
