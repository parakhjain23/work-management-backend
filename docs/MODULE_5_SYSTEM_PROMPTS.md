# MODULE 5: System Prompts (Future Implementation)

## System Prompts Flow

```
1. Event Triggered
   ├─ Work item created/updated/deleted
   ├─ Event dispatcher emits event
   └─ System Prompt Runner receives event

2. System Prompt Runner Processing
   ├─ Check if any prompts match this event
   ├─ Query system_prompts table → Filter by entity, action, conditions
   ├─ If matches found → Execute AI prompts
   └─ If no matches → Skip

3. Execute Matching Prompts
   ├─ For each matching prompt
   ├─ Build context (work item data, history, related items)
   ├─ Call AI with prompt template + context
   ├─ Get AI response
   └─ Save response to database

4. Store Results
   ├─ Save AI output to work_item_logs or custom table
   ├─ Optionally update work item fields
   └─ Optionally trigger another event
```

---

## Pseudo Code

```typescript
SYSTEM_PROMPT_RUNNER.maybeRun(event):
  # Find prompts that match this event
  matching_prompts = DB_FETCH("system_prompts", 
      WHERE entity = event.entity 
      AND action = event.action
      AND is_active = true
  )
  
  # If no prompts, skip
  IF matching_prompts.length == 0:
      LOG("No system prompts for this event")
      RETURN
  
  # Execute each matching prompt
  FOR each prompt in matching_prompts:
      EXECUTE_PROMPT(prompt, event)


EXECUTE_PROMPT(prompt, event):
  # Get work item data
  work_item = DB_FETCH("work_items", event.entity_id)
      INCLUDE: category, custom_fields, logs, parent
  
  # Build context for AI
  context = {
      work_item: work_item,
      changed_fields: event.changed_fields,
      action: event.action,
      timestamp: event.timestamp
  }
  
  # Call AI with prompt template
  ai_response = AI_SERVICE.generate({
      prompt: prompt.template,
      context: context,
      model: prompt.model OR "gpt-4"
  })
  
  # Save AI response
  DB_INSERT("work_item_logs", {
      work_item_id: event.entity_id,
      log_type: 'ai_analysis',
      message: ai_response,
      created_at: NOW()
  })
  
  # If prompt has actions, execute them
  IF prompt.actions:
      EXECUTE_PROMPT_ACTIONS(prompt.actions, work_item, ai_response)


EXECUTE_PROMPT_ACTIONS(actions, work_item, ai_response):
  # Actions can be: update_field, create_child, send_notification
  FOR each action in actions:
      SWITCH action.type:
          CASE 'update_field':
              DB_UPDATE("work_items", work_item.id, {
                  [action.field]: action.value OR ai_response
              })
          
          CASE 'create_child':
              CREATE_WORK_ITEM({
                  parent_id: work_item.id,
                  title: action.title,
                  description: ai_response
              })
          
          CASE 'send_notification':
              SEND_NOTIFICATION(action.recipient, ai_response)
```

---

## Example System Prompts

### **1. Auto-generate subtasks when work item is created**
```json
{
  "entity": "work_item",
  "action": "create",
  "template": "Based on this work item: {{work_item.title}} - {{work_item.description}}, suggest 3-5 subtasks to complete it.",
  "actions": [
    {
      "type": "create_child",
      "title": "{{ai_response.subtask_title}}"
    }
  ]
}
```

### **2. Analyze priority when status changes to IN_PROGRESS**
```json
{
  "entity": "work_item",
  "action": "update",
  "conditions": {
    "changed_fields": ["status"],
    "new_value": "IN_PROGRESS"
  },
  "template": "This work item just started: {{work_item.title}}. Analyze if the priority {{work_item.priority}} is appropriate given the description and deadline.",
  "actions": [
    {
      "type": "update_field",
      "field": "priority",
      "value": "{{ai_response.suggested_priority}}"
    }
  ]
}
```

### **3. Generate insights when work item is completed**
```json
{
  "entity": "work_item",
  "action": "update",
  "conditions": {
    "changed_fields": ["status"],
    "new_value": "CLOSED"
  },
  "template": "This work item was completed: {{work_item.title}}. Review the logs and generate insights about what went well and what could be improved.",
  "actions": [
    {
      "type": "log",
      "log_type": "ai_analysis"
    }
  ]
}
```

---

## Database Schema (Future)

```sql
CREATE TABLE system_prompts (
    id BIGSERIAL PRIMARY KEY,
    org_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Trigger conditions
    entity VARCHAR(50) NOT NULL,  -- 'work_item', 'category', etc.
    action VARCHAR(50) NOT NULL,  -- 'create', 'update', 'delete'
    conditions JSONB,              -- Additional conditions
    
    -- AI configuration
    template TEXT NOT NULL,        -- Prompt template with {{variables}}
    model VARCHAR(50),             -- 'gpt-4', 'gpt-3.5-turbo', etc.
    
    -- Actions to execute
    actions JSONB,                 -- Array of actions to execute with AI response
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (org_id) REFERENCES organizations(id)
);
```
