# System Prompt Condition Evaluation - Data Structure & Examples

## Overview
This document shows the exact data structure available to AI when generating condition code for system prompts. The condition evaluator receives this data and executes JavaScript code to determine if a prompt should trigger.

---

## Data Structure Available in Conditions

When a domain event is triggered, the condition evaluator receives a single `data` object containing both event information and full work item context **in a flat structure**:

### Complete `data` Object Structure

```javascript
{
  // ========================================
  // EVENT FIELDS (from domain event)
  // ========================================
  
  "entity": "work_item",              // Entity type: "work_item" | "custom_field_value" | "category"
  "action": "update",                 // Action: "create" | "update" | "delete"
  "work_item_id": "8",                // Work item ID (optional for category events)
  "org_id": "1",                      // Organization ID
  "category_id": "4",                 // Category ID (if applicable)
  "triggered_by": "user",             // Who triggered: "user" | "system" | "ai"
  
  // Change tracking
  "changedFields": ["rating"],        // Array of field names that changed
  
  "fieldChanges": {
    "rating": {
      "oldValue": 3,
      "newValue": 5,
      "fieldType": "custom_field"     // "standard_field" | "custom_field"
    }
  },
  
  // ========================================
  // WORK ITEM FIELDS (directly at root level)
  // ========================================
  
  "id": "8",
  "title": "Login flow",
  "description": "Login flow is very slow.",
  "status": "CAPTURED",
  "priority": "",
  "categoryId": "4",
  "assigneeId": null,
  "createdBy": "1",
  "updatedBy": "1",
  "startDate": null,
  "dueDate": null,
  "parentId": null,
  "rootParentId": null,
  "externalId": null,
  "docId": null,
  "createdAt": "2026-02-02T09:07:30.535Z",
  "updatedAt": "2026-02-02T09:09:35.896Z",
  
  // ========================================
  // CATEGORY & CUSTOM FIELDS (at root level)
  // ========================================
  
  // Category information (null if work item has no category)
  "category": {
    "id": "4",
    "name": "Feedback",
    "keyName": "feedback",
    "externalTool": "linear"
  },
  
  // Custom fields as key-value pairs (empty object if no custom fields)
  "customFields": {
    "rating": 5,                      // number field
    "status": "approved",             // text/enum field
    "is_blocked": false,              // boolean field
    "tags": ["api", "security"],      // json field
    "estimated_hours": 40.5           // number field
  },
  
  // Custom field metadata (array of field definitions)
  "customFieldsMetadata": [
    {
      "id": "1",
      "keyName": "rating",
      "name": "Rating",
      "dataType": "number",
      "enums": "1,2,3,4,5",
      "description": "rating",
      "meta": {
        "field_type": "single-select"
      }
    },
    {
      "id": "2",
      "keyName": "status",
      "name": "status",
      "dataType": "text",
      "enums": "approved,pending,rejected",
      "description": "status of feedback",
      "meta": {
        "field_type": "single-select"
      }
    }
  ]
}
```

---

## Example Condition Code for AI to Generate

### Example 1: Status Change Detection
**Scenario**: Trigger when work item moves to "IN_PROGRESS"

```javascript
data.entity === 'work_item' && 
data.action === 'update' && 
data.changedFields.includes('status') && 
data.fieldChanges.status.newValue === 'IN_PROGRESS'
```

### Example 2: Priority Escalation
**Scenario**: Trigger when priority changes from LOW/MEDIUM to HIGH/URGENT

```javascript
data.entity === 'work_item' && 
data.action === 'update' && 
data.changedFields.includes('priority') && 
['LOW', 'MEDIUM'].includes(data.fieldChanges.priority.oldValue) &&
['HIGH', 'URGENT'].includes(data.fieldChanges.priority.newValue)
```

### Example 3: Custom Field Threshold
**Scenario**: Trigger when rating drops below 3

```javascript
data.entity === 'custom_field_value' && 
data.action === 'update' && 
data.changedFields.includes('rating') &&
data.fieldChanges.rating.newValue < 3
```

### Example 4: Category-Specific Rule
**Scenario**: Trigger only for "Feedback" category when rating changes

```javascript
data.entity === 'custom_field_value' && 
data.action === 'update' && 
data.changedFields.includes('rating') &&
data.category?.keyName === 'feedback'
```

### Example 5: Complex Multi-Field Condition
**Scenario**: High priority items with perfect rating

```javascript
data.entity === 'work_item' && 
data.priority === 'HIGH' &&
data.category?.keyName === 'feedback' &&
data.customFields?.rating === 5
```

### Example 6: Custom Field Change with Context
**Scenario**: Rating changed to 5 on feedback items

```javascript
data.entity === 'custom_field_value' && 
data.action === 'update' && 
data.changedFields.includes('rating') &&
data.fieldChanges.rating.newValue === 5 &&
data.category?.keyName === 'feedback'
```

### Example 7: New Work Item in Specific Category
**Scenario**: New feedback items created

```javascript
data.entity === 'work_item' && 
data.action === 'create' &&
data.category?.keyName === 'feedback'
```

### Example 8: Due Date Approaching
**Scenario**: Work item updated and due date is within 3 days

```javascript
data.entity === 'work_item' && 
data.action === 'update' &&
data.dueDate &&
new Date(data.dueDate) - new Date() < 3 * 24 * 60 * 60 * 1000
```

### Example 9: Multiple Custom Fields
**Scenario**: Approved status AND high rating

```javascript
data.entity === 'work_item' &&
data.customFields?.status === 'approved' &&
data.customFields?.rating >= 4
```

### Example 10: Category Change
**Scenario**: Work item moved to a different category

```javascript
data.entity === 'work_item' && 
data.action === 'update' &&
data.changedFields.includes('categoryId')
```

---

## AI Prompt Template Examples

When conditions match, the AI receives a prompt template with placeholders:

### Template 1: Status Change Notification
```
Work item "{{data.title}}" has moved from {{data.fieldChanges.status.oldValue}} to {{data.fieldChanges.status.newValue}}.

Category: {{data.category.name}}
Priority: {{data.priority}}
Assignee: {{data.assigneeId}}

Please analyze if this status change is appropriate and suggest next steps.
```

### Template 2: Priority Escalation Alert
```
PRIORITY ESCALATION DETECTED

Work Item: {{data.title}}
Old Priority: {{data.fieldChanges.priority.oldValue}}
New Priority: {{data.fieldChanges.priority.newValue}}
Category: {{data.category.name}}

Custom Fields:
- Status: {{data.customFields.status}}
- Rating: {{data.customFields.rating}}

Analyze the escalation and provide recommendations.
```

### Template 3: Quality Alert
```
Quality concern detected for: {{data.title}}

Rating dropped from {{data.fieldChanges.rating.oldValue}} to {{data.fieldChanges.rating.newValue}}

Current Status: {{data.status}}
Category: {{data.category.name}}

Investigate the quality issue and suggest corrective actions.
```

---

## Data Access Patterns for AI

### Accessing Event Data
```javascript
// Check entity type
data.entity === 'work_item'

// Check action
data.action === 'update'

// Check if field changed
data.changedFields.includes('status')

// Get old/new values
data.fieldChanges.status.oldValue
data.fieldChanges.status.newValue

// Check field type
data.fieldChanges.status.fieldType === 'custom_field'
```

### Accessing Work Item Data
```javascript
// Standard fields (directly from data object)
data.title
data.status
data.priority
data.dueDate

// Category info (use optional chaining - might be null)
data.category?.name
data.category?.keyName

// Custom fields (use optional chaining - might not exist)
data.customFields?.rating
data.customFields?.status
data.customFields?.is_blocked
```

### Safe Null Checks
```javascript
// Always use optional chaining for nested properties
data.category?.keyName === 'feedback'

// Check if custom field exists before comparing
data.customFields?.rating && data.customFields.rating < 3

// Check if field changed before accessing fieldChanges
data.changedFields.includes('status') && data.fieldChanges.status.newValue === 'DONE'
```

---

## Common Patterns for AI to Use

### 1. Field Changed Pattern
```javascript
data.changedFields.includes('FIELD_NAME') && 
data.fieldChanges.FIELD_NAME.newValue === 'EXPECTED_VALUE'
```

### 2. Category Filter Pattern
```javascript
data.category?.keyName === 'CATEGORY_KEY'
```

### 3. Custom Field Threshold Pattern
```javascript
data.customFields?.FIELD_NAME >= THRESHOLD_VALUE
```

### 4. Multi-Condition AND Pattern
```javascript
condition1 && condition2 && condition3
```

### 5. Multi-Condition OR Pattern
```javascript
condition1 || condition2 || condition3
```

### 6. Array Contains Pattern
```javascript
['VALUE1', 'VALUE2'].includes(data.fieldChanges.FIELD.newValue)
```

---

## Important Notes for AI

1. **Always use optional chaining (`?.`)** for nested properties that might be null
2. **Check `data.changedFields`** before accessing `data.fieldChanges`
3. **Custom fields are optional** - always check if they exist
4. **Category can be null** - work items might not have a category
5. **Use strict equality (`===`)** for comparisons
6. **Return boolean** - condition must evaluate to true/false
7. **Keep conditions simple** - complex logic should be in the AI prompt template
8. **All fields are in `data` object** - event fields and work item fields are at the same level

---

## Testing Conditions

You can test conditions in the System Prompt UI by providing sample data:

```javascript
// Test data structure (flat)
const testData = {
  // Event fields
  entity: 'work_item',
  action: 'update',
  changedFields: ['status'],
  fieldChanges: {
    status: {
      oldValue: 'CAPTURED',
      newValue: 'IN_PROGRESS',
      fieldType: 'standard_field'
    }
  },
  // Work item fields
  title: 'Test Task',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  category: {
    keyName: 'feedback',
    name: 'Feedback'
  },
  customFields: {
    rating: 5,
    status: 'approved'
  }
};

// Test your condition
const result = eval(YOUR_CONDITION_CODE);
console.log('Condition matched:', result);
```

---

**Generated**: February 3, 2026  
**Purpose**: Guide AI in generating accurate system prompt conditions  
**Version**: 1.0
