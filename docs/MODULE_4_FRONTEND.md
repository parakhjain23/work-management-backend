# MODULE 4: Frontend

## User Interaction Flow

```
1. Work Item List
   ├─ Page loads → Fetch work items
   ├─ User filters by category/status → Refresh list
   ├─ User clicks create → Show form modal
   └─ User clicks item → Go to detail page

2. Create Work Item
   ├─ User fills form (title, category, description)
   ├─ User submits → Call POST /work-items
   ├─ Success → Close modal, add to list
   └─ Error → Show error message

3. Edit Work Item
   ├─ User changes fields
   ├─ User saves → Call PATCH /work-items/:id
   ├─ Success → Update display
   └─ Error → Show error message

4. Edit Custom Fields
   ├─ User edits custom field values
   ├─ User saves → Call PATCH /work-items/:id/custom-fields
   └─ Update display

5. Chatbot
   ├─ User opens chatbot → Get embed token
   ├─ Load GTWY widget
   ├─ User asks question → GTWY searches RAG and executes intents
   └─ Show AI response
```

---

## Pseudo Code

```typescript
WORK_ITEM_LIST_COMPONENT():
  # Load work items when page opens
  ON_MOUNT:
      work_items = API.get('/work-items', filters)
  
  # When user creates new item
  HANDLE_CREATE(data):
      new_item = API.post('/work-items', data)
      ADD_TO_LIST(new_item)
      SHOW_SUCCESS("Work item created")
  
  # When user changes filters
  HANDLE_FILTER_CHANGE(filters):
      work_items = API.get('/work-items', filters)


WORK_ITEM_DETAIL_COMPONENT(work_item_id):
  # Load work item and custom fields
  ON_MOUNT:
      work_item = API.get('/work-items/' + work_item_id)
      custom_fields = API.get('/work-items/' + work_item_id + '/custom-fields')
  
  # When user updates work item
  HANDLE_UPDATE(data):
      updated = API.patch('/work-items/' + work_item_id, data)
      UPDATE_DISPLAY(updated)
      SHOW_SUCCESS("Updated")
  
  # When user updates custom fields
  HANDLE_UPDATE_CUSTOM_FIELDS(values):
      updated = API.patch('/work-items/' + work_item_id + '/custom-fields', values)
      UPDATE_DISPLAY(updated)


CHATBOT_COMPONENT():
  # Get token and load chatbot
  ON_MOUNT:
      token = API.get('/chatbot/embed-token')
      GTWY.init(token)
  
  # GTWY handles everything:
  # - User asks question
  # - Searches RAG
  # - Executes intents
  # - Shows response


API_CLIENT:
  get(url, params):
      RETURN AXIOS.get('http://localhost:3000' + url, params)
  
  post(url, data):
      RETURN AXIOS.post('http://localhost:3000' + url, data)
  
  patch(url, data):
      RETURN AXIOS.patch('http://localhost:3000' + url, data)
```
