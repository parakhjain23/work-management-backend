# Backend Complete Implementation Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Implemented Features](#implemented-features)
5. [Testing Guide](#testing-guide)
6. [Environment Setup](#environment-setup)
7. [API Reference](#api-reference)

---

## System Overview

This is an **AI-first Work Management System** with dual interfaces:
- **AI Chatbot (GTWY)**: Natural language interface using SQL execution
- **Frontend UI**: Traditional REST API for manual operations

### Key Technologies
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Runtime**: Node.js + TypeScript
- **AI Integration**: GTWY chatbot, Hippocampus RAG
- **Framework**: Express.js

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND UI                           │
│                   (React/Next.js)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ REST API Calls
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │→ │ Controllers  │→ │  Services    │      │
│  └──────────────┘  └──────────────┘  └──────┬───────┘      │
│                                              │               │
│  ┌──────────────┐  ┌──────────────┐         │               │
│  │ AI Endpoints │  │  RAG System  │         │               │
│  │ (SQL Exec)   │  │  (Search)    │         │               │
│  └──────┬───────┘  └──────────────┘         │               │
│         │                                    │               │
│         └────────────────┬───────────────────┘               │
│                          ↓                                   │
│                   ┌──────────────┐                           │
│                   │ Event Logger │                           │
│                   └──────┬───────┘                           │
│                          │                                   │
│              ┌───────────┴───────────┐                       │
│              ↓                       ↓                       │
│       ┌─────────────┐         ┌─────────────┐               │
│       │RAG Producer │         │System Prompts│               │
│       └─────────────┘         └─────────────┘               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
            ┌──────────────────────┐
            │   PostgreSQL DB      │
            │   (Supabase)         │
            └──────────────────────┘
                       ↑
                       │
            ┌──────────┴──────────┐
            │  Hippocampus API    │
            │  (Vector DB/RAG)    │
            └─────────────────────┘
```

### Component Breakdown

#### 1. **Frontend REST APIs**
- **Purpose**: Manual user operations via UI
- **Location**: `src/routes/`, `src/controllers/`, `src/services/`
- **Authentication**: Mock auth (`req.user = { id: 1, org_id: 1 }`)
- **Endpoints**: 21 REST endpoints for CRUD operations

#### 2. **AI Endpoints**
- **Purpose**: AI chatbot SQL execution
- **Location**: `src/routes/ai.*.ts`, `src/ai/`
- **Endpoints**:
  - `GET /ai/schema` - Database schema introspection
  - `POST /ai/execute-sql` - Execute SQL queries
- **Security**: SQL whitelist, blocked keywords

#### 3. **RAG System**
- **Purpose**: Semantic search over work items
- **Components**:
  - **RAG Client**: Hippocampus API integration
  - **RAG Producer**: Indexes work items to vector DB
  - **RAG Consumer**: Search endpoint
  - **RAG Document Builder**: Formats work items for indexing
- **Endpoint**: `POST /rag/search`

#### 4. **Event System**
- **Purpose**: Track mutations and trigger downstream systems
- **Location**: `src/events/event.logger.ts`
- **Flow**: SQL Execution → Event Logger → RAG Producer / System Prompts
- **Method**: SQL parsing to extract entity type, action, ID

#### 5. **Chatbot Integration**
- **Purpose**: GTWY chatbot embed token generation
- **Location**: `src/chatbot/`
- **Endpoint**: `GET /chatbot/embed-token`
- **Technology**: JWT tokens with GTWY organization ID

---

## Database Schema

### Core Tables

#### **organizations**
```sql
id          BIGSERIAL PRIMARY KEY
name        VARCHAR(255)
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

#### **categories**
```sql
id            BIGSERIAL PRIMARY KEY
org_id        BIGINT → organizations(id)
key_name      VARCHAR(255) UNIQUE per org
name          VARCHAR(255)
external_tool VARCHAR(100)
created_at    TIMESTAMP
updated_at    TIMESTAMP

UNIQUE (org_id, key_name)
```

#### **work_items**
```sql
id              BIGSERIAL PRIMARY KEY
category_id     BIGINT → categories(id)
title           VARCHAR(500)
description     TEXT
status          ENUM (CAPTURED, CLARIFYING, THINKING, DECIDED, IN_PROGRESS, IN_REVIEW, CLOSED, ARCHIVED)
priority        ENUM (LOW, MEDIUM, HIGH, URGENT)
assignee_id     BIGINT
parent_id       BIGINT → work_items(id)
root_parent_id  BIGINT → work_items(id)
start_date      DATE
due_date        DATE
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

#### **custom_field_meta_data**
```sql
id          BIGSERIAL PRIMARY KEY
org_id      BIGINT → organizations(id)
category_id BIGINT → categories(id)
name        VARCHAR(255)
key_name    VARCHAR(255) UNIQUE per org
data_type   ENUM (number, text, boolean, json)
description TEXT
enums       TEXT (comma-separated values)
meta        JSON (UI metadata)
created_at  TIMESTAMP
updated_at  TIMESTAMP

UNIQUE (org_id, key_name)
```

#### **custom_field_values**
```sql
id                        BIGSERIAL PRIMARY KEY
work_item_id              BIGINT → work_items(id)
custom_field_meta_data_id BIGINT → custom_field_meta_data(id)
value_number              DECIMAL(15,4)
value_text                TEXT
value_boolean             BOOLEAN
value_json                JSON
calculated_by             ENUM (ai, user, system)
created_at                TIMESTAMP
updated_at                TIMESTAMP

UNIQUE (work_item_id, custom_field_meta_data_id)
```

#### **work_item_logs**
```sql
id           BIGSERIAL PRIMARY KEY
work_item_id BIGINT → work_items(id)
log_type     ENUM (status_change, comment, sync, ai_analysis, field_update)
old_value    TEXT
new_value    TEXT
message      TEXT
created_at   TIMESTAMP
```

---

## Implemented Features

### ✅ 1. Categories Management
- Create, read, update, delete categories
- Unique key_name per organization
- Prevent deletion if work items exist
- External tool integration support

### ✅ 2. Work Items Management
- Full CRUD operations
- Hierarchical structure (parent-child)
- Status and priority management
- Filtering by category, status, priority
- Pagination support
- Automatic logging of changes

### ✅ 3. Custom Fields System
- Define custom field metadata per category
- Support for 4 data types: number, text, boolean, json
- UPSERT custom field values
- Type validation
- UI metadata storage (enums, placeholders)
- Automatic logging of changes

### ✅ 4. Work Item Logs
- Automatic creation on work item mutations
- Read-only access via API
- Tracks all changes with timestamps
- Ordered by newest first

### ✅ 5. AI SQL Execution
- Whitelist-based table access
- Blocked dangerous keywords
- BigInt serialization
- Schema introspection endpoint
- Event logging for all mutations

### ✅ 6. RAG System
- Semantic search over work items
- Automatic indexing on create/update/delete
- Event-driven architecture
- Handles custom field changes
- Handles category name changes
- Handles custom field metadata changes
- Organization-scoped collections

### ✅ 7. GTWY Chatbot Integration
- JWT embed token generation
- Organization-scoped authentication
- Auto-open on page load
- Styled chatbot UI

### ✅ 8. Event System
- SQL-based mutation detection
- Entity type extraction
- Action detection (CREATE, UPDATE, DELETE)
- Triggers RAG updates
- Triggers system prompts (placeholder)

---

## Environment Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase)
- Hippocampus API key (for RAG)
- GTWY chatbot credentials

### Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Server
PORT=3000
NODE_ENV=development

# GTWY Chatbot
GTWY_ORG_ID=58844
GTWY_CHATBOT_ID=69785c0b108ba50ee320501b
GTWY_JWT_SECRET=your_jwt_secret

# Hippocampus RAG
HIPPOCAMPUS_API_URL=https://api.hippocampus.ai
HIPPOCAMPUS_API_KEY=your_hippocampus_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations (if using Prisma migrations)
npx prisma migrate dev

# Or apply schema manually
psql -d your_database -f schema.sql

# Seed database (optional)
npx prisma db seed

# Start server
npm run dev
```

Server runs on `http://localhost:3000`

---

## Testing Guide

### 1. Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-29T10:00:00.000Z"
}
```

---

### 2. Test Categories API

#### Create Category
```bash
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "bugs",
    "name": "Bug Reports",
    "externalTool": "jira"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "orgId": "1",
    "keyName": "bugs",
    "name": "Bug Reports",
    "externalTool": "jira",
    "createdAt": "2024-01-29T10:00:00.000Z",
    "updatedAt": "2024-01-29T10:00:00.000Z"
  }
}
```

#### Get All Categories
```bash
curl http://localhost:3000/categories
```

#### Update Category
```bash
curl -X PATCH http://localhost:3000/categories/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Critical Bugs"
  }'
```

---

### 3. Test Work Items API

#### Create Work Item
```bash
curl -X POST http://localhost:3000/work-items \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": 1,
    "title": "Fix payment gateway timeout",
    "description": "Payment processing fails after 30 seconds",
    "priority": "HIGH",
    "status": "CAPTURED"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "42",
    "categoryId": "1",
    "title": "Fix payment gateway timeout",
    "description": "Payment processing fails after 30 seconds",
    "status": "CAPTURED",
    "priority": "HIGH",
    "assigneeId": null,
    "parentId": null,
    "createdAt": "2024-01-29T10:00:00.000Z",
    "category": {
      "id": "1",
      "name": "Bug Reports",
      "keyName": "bugs"
    }
  }
}
```

#### Get Work Items with Filters
```bash
# All work items
curl http://localhost:3000/work-items

# Filter by category
curl http://localhost:3000/work-items?categoryId=1

# Filter by status
curl http://localhost:3000/work-items?status=IN_PROGRESS

# Filter by priority
curl http://localhost:3000/work-items?priority=HIGH

# Pagination
curl http://localhost:3000/work-items?limit=10&offset=0

# Combined filters
curl "http://localhost:3000/work-items?categoryId=1&status=IN_PROGRESS&priority=HIGH&limit=10"
```

#### Update Work Item
```bash
curl -X PATCH http://localhost:3000/work-items/42 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS",
    "priority": "URGENT"
  }'
```

#### Get Work Item by ID
```bash
curl http://localhost:3000/work-items/42
```

---

### 4. Test Custom Fields API

#### Create Custom Field Metadata
```bash
curl -X POST http://localhost:3000/categories/1/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Root Cause",
    "keyName": "root_cause",
    "dataType": "text",
    "description": "What caused this issue",
    "meta": {
      "placeholder": "Enter root cause analysis"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "orgId": "1",
    "categoryId": "1",
    "name": "Root Cause",
    "keyName": "root_cause",
    "dataType": "text",
    "description": "What caused this issue",
    "enums": null,
    "meta": {
      "placeholder": "Enter root cause analysis"
    },
    "createdAt": "2024-01-29T10:00:00.000Z"
  }
}
```

#### Create Enum Field
```bash
curl -X POST http://localhost:3000/categories/1/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Impact",
    "keyName": "customer_impact",
    "dataType": "text",
    "description": "Impact level on customers",
    "enums": "Low,Medium,High,Critical"
  }'
```

#### Get Custom Fields for Category
```bash
curl http://localhost:3000/categories/1/custom-fields
```

#### Update Custom Field Values
```bash
curl -X PATCH http://localhost:3000/work-items/42/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "root_cause": "Database connection pool exhaustion",
    "customer_impact": "High"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "root_cause": "Database connection pool exhaustion",
    "customer_impact": "High"
  }
}
```

#### Get Custom Field Values
```bash
curl http://localhost:3000/work-items/42/custom-fields
```

---

### 5. Test Work Item Logs

#### Get Logs for Work Item
```bash
curl http://localhost:3000/work-items/42/logs
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "3",
      "workItemId": "42",
      "logType": "field_update",
      "oldValue": null,
      "newValue": null,
      "message": "Custom fields updated: Root Cause updated to Database connection pool exhaustion, Customer Impact updated to High",
      "createdAt": "2024-01-29T10:05:00.000Z"
    },
    {
      "id": "2",
      "workItemId": "42",
      "logType": "field_update",
      "oldValue": null,
      "newValue": null,
      "message": "Status changed from CAPTURED to IN_PROGRESS; Priority changed from HIGH to URGENT",
      "createdAt": "2024-01-29T10:02:00.000Z"
    },
    {
      "id": "1",
      "workItemId": "42",
      "logType": "field_update",
      "oldValue": null,
      "newValue": null,
      "message": "Work item created",
      "createdAt": "2024-01-29T10:00:00.000Z"
    }
  ]
}
```

---

### 6. Test Child Work Items

#### Create Child Work Item
```bash
curl -X POST http://localhost:3000/work-items/42/children \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Increase connection pool size",
    "description": "Update database configuration",
    "priority": "HIGH"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "43",
    "parentId": "42",
    "categoryId": "1",
    "title": "Increase connection pool size",
    "description": "Update database configuration",
    "priority": "HIGH",
    "status": "CAPTURED"
  }
}
```

#### Get Children
```bash
curl http://localhost:3000/work-items/42/children
```

---

### 7. Test AI Endpoints

#### Get Database Schema
```bash
curl http://localhost:3000/ai/schema
```

**Expected Response:**
```json
{
  "success": true,
  "schema": {
    "organizations": {
      "columns": ["id", "name", "created_at", "updated_at"]
    },
    "categories": {
      "columns": ["id", "org_id", "key_name", "name", "external_tool", "created_at", "updated_at"]
    },
    "work_items": {
      "columns": ["id", "category_id", "title", "description", "status", "priority", ...]
    }
  }
}
```

#### Execute SQL Query
```bash
curl -X POST http://localhost:3000/ai/execute-sql \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM work_items WHERE status = '\''IN_PROGRESS'\'' LIMIT 5"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "type": "SELECT",
  "data": [
    {
      "id": "42",
      "title": "Fix payment gateway timeout",
      "status": "IN_PROGRESS",
      "priority": "URGENT"
    }
  ],
  "rowCount": 1
}
```

---

### 8. Test RAG Search

#### Search Work Items
```bash
curl -X POST http://localhost:3000/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "payment gateway issues",
    "limit": 5,
    "minScore": 0.75
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "work_item_ids": [42, 15, 8]
}
```

---

### 9. Test Chatbot Embed Token

```bash
curl http://localhost:3000/chatbot/embed-token
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Error Testing

### Test Validation Errors (400)

```bash
# Missing required field
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bug Reports"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "keyName and name are required"
}
```

### Test Not Found (404)

```bash
# Non-existent category
curl http://localhost:3000/categories/999999
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Category not found"
}
```

### Test Conflict (409)

```bash
# Duplicate key_name
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -d '{
    "keyName": "bugs",
    "name": "Duplicate Bugs"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Category with this key_name already exists"
}
```

---

## Complete Test Flow

Here's a complete end-to-end test scenario:

```bash
# 1. Create a category
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -d '{"keyName": "bugs", "name": "Bug Reports"}'

# 2. Create custom fields for the category
curl -X POST http://localhost:3000/categories/1/custom-fields \
  -H "Content-Type: application/json" \
  -d '{"name": "Root Cause", "keyName": "root_cause", "dataType": "text"}'

curl -X POST http://localhost:3000/categories/1/custom-fields \
  -H "Content-Type: application/json" \
  -d '{"name": "Severity", "keyName": "severity", "dataType": "number"}'

# 3. Create a work item
curl -X POST http://localhost:3000/work-items \
  -H "Content-Type: application/json" \
  -d '{"categoryId": 1, "title": "Payment bug", "priority": "HIGH"}'

# 4. Update custom fields
curl -X PATCH http://localhost:3000/work-items/1/custom-fields \
  -H "Content-Type: application/json" \
  -d '{"root_cause": "DB timeout", "severity": 8}'

# 5. Update work item status
curl -X PATCH http://localhost:3000/work-items/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'

# 6. Create a child work item
curl -X POST http://localhost:3000/work-items/1/children \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix DB connection pool"}'

# 7. View logs
curl http://localhost:3000/work-items/1/logs

# 8. Search via RAG
curl -X POST http://localhost:3000/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "payment database timeout", "limit": 5}'
```

---

## Monitoring & Debugging

### Server Logs

The server logs all requests:
```
[2024-01-29T10:00:00.000Z] POST /work-items - User: 1
[2024-01-29T10:00:01.000Z] PATCH /work-items/42 - User: 1
```

### Event Logs

Event system logs all mutations:
```
[EVENT] {"entity_type":"work_item","action":"CREATE","entity_id":42,"sql":"INSERT INTO..."}
[RAG Producer] Indexing work item 42
[RAG] Added resource: workItem:42 to collection collection_abc123
```

### Database Queries

Enable Prisma query logging in `.env`:
```env
DATABASE_URL="postgresql://...?schema=public&connection_limit=10&pool_timeout=20"
DEBUG=prisma:query
```

---

## Performance Considerations

### Indexing
- Work items are indexed to RAG asynchronously
- No blocking on RAG operations
- Failed RAG operations don't affect API responses

### Pagination
- Default limit: 50 work items
- Use `limit` and `offset` for large datasets

### Caching
- RAG collection IDs are cached in memory
- Reduces Hippocampus API calls

---

## Security Notes

### Current Implementation (POC)
- ⚠️ Mock authentication (all requests as user 1, org 1)
- ⚠️ No authorization checks
- ⚠️ SQL whitelist for AI endpoints
- ⚠️ Blocked dangerous SQL keywords

### Production Requirements
- ✅ Implement real authentication (JWT, OAuth)
- ✅ Add role-based access control
- ✅ Add rate limiting
- ✅ Add request validation middleware
- ✅ Add SQL injection prevention
- ✅ Add CORS restrictions
- ✅ Add API key management

---

## Troubleshooting

### Issue: "Category not found"
- Ensure category exists in database
- Check org_id matches (currently hardcoded to 1)

### Issue: "Custom field not found"
- Verify keyName matches exactly
- Check field belongs to correct organization

### Issue: RAG search returns empty
- Ensure work items have been indexed
- Check Hippocampus API key is valid
- Verify collection was created

### Issue: BigInt serialization error
- Ensure all BigInt values are converted to strings in responses
- Check `serializeBigInt()` helper is used

---

## Next Steps

### Immediate
1. Test all endpoints with Postman/Insomnia
2. Verify RAG indexing works end-to-end
3. Test GTWY chatbot integration

### Short-term
1. Add real authentication
2. Add input validation middleware
3. Add comprehensive error logging
4. Add API documentation (Swagger/OpenAPI)

### Long-term
1. Add permissions system
2. Add bulk operations
3. Add webhooks
4. Add real-time updates (WebSockets)
5. Add file attachments
6. Add notifications

---

## Support

For issues or questions:
1. Check server logs
2. Check database connection
3. Verify environment variables
4. Review API documentation
5. Check Prisma schema matches database

---

**Documentation Version**: 1.0  
**Last Updated**: January 29, 2024  
**Backend Version**: 1.0.0
