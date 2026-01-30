# MODULE 3: Backend Core

## Event System Flow

```
1. When Something Changes in Database
   ├─ Service saves to database
   ├─ Service logs the change
   └─ Service emits event

2. Event Dispatcher Receives Event
   ├─ Validates event has required fields
   ├─ Logs it for debugging
   └─ Triggers subscribers (async, doesn't block response)
       ├─ System Prompt Runner → Will run AI prompts based on rules (future)
       └─ RAG Producer → Indexes in RAG for search

3. BigInt Handling
   ├─ Database IDs are BigInt (very large numbers)
   ├─ Convert to strings before sending JSON
   └─ Prevents serialization errors
```

---

## Pseudo Code

```typescript
EVENT_DISPATCHER.emit(event):
  # Validate event has required fields
  VALIDATE(event has entity, action, entity_id, triggered_by, timestamp)
  
  # Log it
  LOG("Event emitted:", event)
  
  # Trigger subscribers async (don't wait)
  ASYNC:
      SYSTEM_PROMPT_RUNNER.maybeRun(event)  # Future: run AI prompts
      RAG_PRODUCER.maybeIndex(event)         # Index in RAG
  
  RETURN


SERIALIZE_BIGINT(obj):
  # Convert BigInt to string recursively
  IF obj is BigInt:
      RETURN obj.toString()
  IF obj is Array:
      RETURN [SERIALIZE_BIGINT(item) for each item]
  IF obj is Object:
      RETURN {key: SERIALIZE_BIGINT(value) for each key, value}
  RETURN obj


START_SERVER():
  # Connect to database
  prisma.connect()
  
  # Setup Express with middleware
  app = EXPRESS()
  app.use(CORS, JSON_PARSER, MOCK_AUTH)
  
  # Register all routes
  app.use(categories_routes, work_items_routes, custom_fields_routes, 
          intent_routes, rag_routes, chatbot_routes)
  
  # Start listening
  app.listen(3000)
  LOG("Server running on port 3000")


GET_CHATBOT_EMBED_TOKEN(request):
  # Generate JWT for GTWY chatbot
  token = JWT_SERVICE.generateEmbedToken({
      userId: request.user.id,
      orgId: request.user.org_id,
      chatbotId: GTWY_CHATBOT_ID
  })
  
  RETURN token
```
