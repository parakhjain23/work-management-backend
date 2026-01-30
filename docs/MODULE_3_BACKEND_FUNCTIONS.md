# MODULE 3: Backend Core - Function Documentation

## File: `src/events/event.dispatcher.centralized.ts`

### `emit(event)`
→ Validate event shape, log event, trigger async fan-out to subscribers

### `validateEvent(event)`
→ Check required fields (entity, action, entity_id, triggered_by, timestamp)

### `fanOut(event)`
→ Call system prompt runner and RAG producer asynchronously

### `triggerSystemPrompts(event)`
→ Log what system prompts would run (placeholder for future implementation)

### `triggerRagProducer(event)`
→ Log what RAG indexing would happen, call RAG producer

### `CentralizedEventDispatcher.workItemEvent(action, entityId, triggeredBy, changedFields, parentId)`
→ Create standardized work_item event object

### `CentralizedEventDispatcher.categoryEvent(action, entityId, triggeredBy, changedFields)`
→ Create standardized category event object

### `CentralizedEventDispatcher.customFieldEvent(action, entityId, triggeredBy, changedFields)`
→ Create standardized custom_field event object

### `CentralizedEventDispatcher.customFieldValueEvent(action, entityId, triggeredBy, changedFields)`
→ Create standardized custom_field_value event object

---

## File: `src/systemPrompts/runner.ts`

### `maybeRun(event)`
→ Check if event matches system prompt rules, log what would execute (placeholder)

---

## File: `src/utils/bigint.serializer.ts`

### `serializeBigInt(obj)`
→ Recursively convert all BigInt values to strings for JSON responses

---

## File: `src/middleware/auth.mock.ts`

### `mockAuthMiddleware(request, response, next)`
→ Attach mock user (id: 1, org_id: 1) to request for development

---

## File: `src/db/prisma.ts`

### `getPrismaClient()`
→ Return singleton Prisma client instance for database queries

---

## File: `src/app/server.ts`

### `app.use(cors())`
→ Enable CORS for frontend requests

### `app.use(express.json())`
→ Parse JSON request bodies

### `app.use(mockAuthMiddleware)`
→ Attach mock user to all requests

### `app.use(routes)`
→ Register all API routes (categories, work-items, custom-fields, intent, rag, chatbot)

### `app.use(errorHandler)`
→ Catch and format all errors as JSON responses

---

## File: `src/index.ts`

### `startServer()`
→ Initialize Prisma, connect to database, start Express server on port 3000

### `gracefulShutdown()`
→ Disconnect Prisma, close server on SIGTERM/SIGINT

---

## File: `src/chatbot/gtwy.controller.ts`

### `getEmbedToken(request, response)`
→ Generate JWT token for GTWY chatbot embedding

---

## File: `src/chatbot/gtwy.jwt.ts`

### `generateEmbedToken(params)`
→ Create signed JWT with user context for GTWY chatbot

---

## File: `src/ai/sql.service.ts`

### `executeSql(request, response)`
→ Block mutation SQL, allow only SELECT queries, execute via Prisma

### `validateSqlQuery(sql)`
→ Check if SQL is read-only (no INSERT/UPDATE/DELETE/DROP)

---

## Architecture Flow

```
HTTP Request
    ↓
Express Middleware
    ├─→ CORS
    ├─→ JSON Parser
    └─→ Mock Auth
    ↓
Routes
    ↓
Controllers
    ↓
Services
    ├─→ Prisma (DB)
    └─→ Event Dispatcher
            ├─→ System Prompts
            └─→ RAG Producer
    ↓
Response (BigInt Serialized)
```
