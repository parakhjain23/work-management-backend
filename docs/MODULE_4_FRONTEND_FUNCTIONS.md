# MODULE 4: Frontend - Function Documentation

## File: `src/components/WorkItemList.tsx`

### `fetchWorkItems()`
→ Call GET /work-items API, update state with work items

### `handleCreateWorkItem(data)`
→ Call POST /work-items API, refresh list on success

### `handleUpdateWorkItem(id, data)`
→ Call PATCH /work-items/:id API, refresh list on success

### `handleDeleteWorkItem(id)`
→ Call DELETE /work-items/:id API, remove from list on success

### `renderWorkItem(workItem)`
→ Display work item card with title, status, priority, category

---

## File: `src/components/WorkItemDetail.tsx`

### `fetchWorkItemById(id)`
→ Call GET /work-items/:id API, update state with work item details

### `fetchCustomFieldValues(id)`
→ Call GET /work-items/:id/custom-fields API, update state with custom fields

### `handleUpdateCustomFields(id, values)`
→ Call PATCH /work-items/:id/custom-fields API, refresh values on success

### `renderCustomField(field, value)`
→ Display custom field input based on data type (text, number, boolean, json)

---

## File: `src/components/CategoryList.tsx`

### `fetchCategories()`
→ Call GET /categories API, update state with categories

### `handleCreateCategory(data)`
→ Call POST /categories API, refresh list on success

### `handleUpdateCategory(id, data)`
→ Call PATCH /categories/:id API, refresh list on success

### `handleDeleteCategory(id)`
→ Call DELETE /categories/:id API, remove from list on success

---

## File: `src/components/Chatbot.tsx`

### `fetchEmbedToken()`
→ Call GET /chatbot/embed-token API, get JWT for GTWY chatbot

### `initializeChatbot(token)`
→ Load GTWY chatbot widget with embed token

### `handleChatMessage(message)`
→ Send message to GTWY chatbot, receive AI response

---

## File: `src/hooks/useWorkItems.ts`

### `useWorkItems(filters)`
→ Custom hook to fetch and manage work items state

### `createWorkItem(data)`
→ POST request to create work item, update cache

### `updateWorkItem(id, data)`
→ PATCH request to update work item, update cache

### `deleteWorkItem(id)`
→ DELETE request to delete work item, update cache

---

## File: `src/hooks/useCategories.ts`

### `useCategories()`
→ Custom hook to fetch and manage categories state

### `createCategory(data)`
→ POST request to create category, update cache

### `updateCategory(id, data)`
→ PATCH request to update category, update cache

### `deleteCategory(id)`
→ DELETE request to delete category, update cache

---

## File: `src/services/api.ts`

### `apiClient.get(url, params)`
→ Make GET request to backend API with auth headers

### `apiClient.post(url, data)`
→ Make POST request to backend API with auth headers

### `apiClient.patch(url, data)`
→ Make PATCH request to backend API with auth headers

### `apiClient.delete(url)`
→ Make DELETE request to backend API with auth headers

---

## File: `src/context/AuthContext.tsx`

### `useAuth()`
→ Custom hook to access user authentication state

### `login(credentials)`
→ Authenticate user, store token, update context

### `logout()`
→ Clear user session, remove token, redirect to login

---

## Component Flow

```
User Interaction
    ↓
React Component
    ↓
Custom Hook (useWorkItems, useCategories)
    ↓
API Client (axios)
    ↓
Backend REST API
    ↓
Response
    ↓
Update State (React Query / useState)
    ↓
Re-render UI
```

---

## Chatbot Flow

```
User Opens Chatbot
    ↓
fetchEmbedToken()
    ↓
Backend: GET /chatbot/embed-token
    ↓
Generate JWT with user context
    ↓
Return embed token
    ↓
Initialize GTWY Chatbot Widget
    ↓
User Sends Message
    ↓
GTWY AI processes message
    ├─→ Query RAG (GET /rag/search)
    ├─→ Execute Intent (POST /ai/intent)
    └─→ Return AI response
    ↓
Display response in chat
```
