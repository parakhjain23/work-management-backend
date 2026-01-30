# MODULE 1: RAG System - Function Documentation

## File: `src/rag/rag.producer.ts`

### `maybeIndex(event)`
→ Check if event needs RAG indexing, call appropriate handler

### `indexWorkItem(workItemId, orgId)`
→ Fetch work item with relations, build document text, call GTWY API to index

### `deleteWorkItem(workItemId, orgId)`
→ Delete document from RAG using GTWY API

### `buildDocumentText(workItem)`
→ Combine title, description, category, custom fields into searchable text

---

## File: `src/rag/rag.consumer.ts`

### `ragSearch(request, response)`
→ Get user query, search RAG via GTWY API, return matching work item IDs

### `getCollectionId(orgId)`
→ Fetch or create RAG collection ID for organization

---

## File: `src/rag/rag.client.ts`

### `createCollection(name, description)`
→ Call GTWY API to create new RAG collection

### `upsert(collectionId, documentId, text, metadata, ownerId)`
→ Index or update document in RAG collection

### `query(collectionId, queryText, ownerId, limit, minScore)`
→ Search RAG collection, return relevant documents with scores

### `deleteDocument(collectionId, documentId, ownerId)`
→ Remove document from RAG collection

---

## Event Flow

```
Work Item Created/Updated
    ↓
Event Dispatcher
    ↓
RAG Producer (maybeIndex)
    ↓
indexWorkItem
    ↓
buildDocumentText
    ↓
GTWY API (upsert)
```
