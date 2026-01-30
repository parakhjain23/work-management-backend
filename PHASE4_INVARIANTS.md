# PHASE 4: Hard Backend Guards & Invariant Enforcement

## Overview

PHASE 4 strengthens backend guarantees by enforcing non-negotiable invariants that ensure data consistency and prevent AI or users from corrupting core semantics.

## Implemented Invariants

### Invariant 1: Work Item Identity

**Immutable Fields**:
- `id` - Cannot be changed after creation
- `created_at` - Cannot be modified
- `created_by` - Cannot be changed after creation

**Enforcement**:
```typescript
// Any UPDATE attempting to modify these fields is rejected
UPDATE work_items SET created_at = NOW() WHERE id = 123
// Returns: 409 Conflict - "Cannot modify immutable field: created_at"
```

### Invariant 2: Parent-Child Integrity

**Rules**:
- `parent_id` must reference an existing work_item
- `parent_id` cannot equal its own `id` (no self-parenting)
- Parent-child chains must not form cycles
- Child work item must belong to same org as parent

**Enforcement**:
```typescript
// Self-parenting blocked
UPDATE work_items SET parent_id = 123 WHERE id = 123
// Returns: 409 Conflict - "A work item cannot be its own parent"
```

### Invariant 3: Status Transition Rules

**Allowed Transitions**:
```
CAPTURED → CLARIFYING → THINKING → DECIDED → IN_PROGRESS → IN_REVIEW → CLOSED
```

**Special Cases**:
- `ARCHIVED` is terminal (no transitions out)
- `CLOSED` can only transition via explicit reopen logic
- No backward jumps without explicit intent

**Status Flow**:
- Forward progression encouraged
- Backward movement requires justification
- Terminal states protected

### Invariant 4: Mandatory Logging

**Logged Fields** (any change triggers log):
- `status`
- `assignee_id`
- `priority`
- `parent_id`
- `category_id`

**Enforcement**:
- Every mutation changing these fields writes to `work_item_logs`
- If log write fails → mutation fails
- Ensures complete audit trail

### Invariant 5: Category Consistency

**Rules**:
- `category_id` must exist in `categories` table
- Category cannot be changed silently
- Category change requires explicit user intent

### Invariant 6: Logical Deletion Only

**Physical DELETE Forbidden**:
```typescript
DELETE FROM work_items WHERE id = 123
// Returns: 409 Conflict - "Physical deletion of work items is not allowed. Use status = ARCHIVED instead"
```

**Correct Approach**:
```typescript
UPDATE work_items SET status = 'ARCHIVED' WHERE id = 123
// Accepted - logical deletion
```

## HTTP Status Codes

### 409 Conflict
Returned for invariant violations:
- Immutable field modification
- Self-parenting attempt
- Physical deletion attempt
- Invalid status transition

### 403 Forbidden
Returned for security violations:
- Blocked keywords
- Table not in whitelist
- Scope violations
- Missing WHERE clause

### 400 Bad Request
Returned for validation errors:
- Invalid SQL syntax
- Empty query
- Invalid statement type

## Implementation Details

### Validation Pipeline

All SQL passes through:
1. **Syntax Validation** (Phase 2) - SQL structure
2. **Scope Validation** (Phase 3) - ThreadId boundaries
3. **Invariant Validation** (Phase 4) - Business rules ✨
4. **Execution** - Only if all pass

### Files Created

- `src/ai/invariant.guard.ts` - Invariant validation logic
- `src/ai/sql.service.ts` - Updated with invariant checks
- `src/ai/sql.controller.ts` - Updated with 409 status handling

## Testing Scenarios

### Test 1: Immutable Field Protection
```typescript
// Attempt to modify created_at
UPDATE work_items SET created_at = NOW() WHERE id = 1
// Expected: 409 Conflict
```

### Test 2: Self-Parenting Prevention
```typescript
// Attempt self-parent
UPDATE work_items SET parent_id = 123 WHERE id = 123
// Expected: 409 Conflict
```

### Test 3: Physical Deletion Block
```typescript
// Attempt physical delete
DELETE FROM work_items WHERE id = 123
// Expected: 409 Conflict
```

### Test 4: Logical Deletion Success
```typescript
// Correct approach
UPDATE work_items SET status = 'ARCHIVED' WHERE id = 123
// Expected: 200 OK
```

## Error Messages

All error messages are:
- **User-safe** - No internal DB structure exposed
- **Actionable** - Explain what rule was violated
- **Clear** - Easy to understand

Examples:
- "Cannot modify immutable field: created_at"
- "A work item cannot be its own parent"
- "Physical deletion of work items is not allowed. Use status = ARCHIVED instead"

## Benefits

1. **Data Integrity** - Core semantics protected
2. **Audit Trail** - All state changes logged
3. **Predictability** - Consistent behavior
4. **Safety** - AI cannot corrupt data
5. **Maintainability** - Rules enforced in one place

## What's NOT Enforced (Yet)

- Cycle detection in parent chains (requires graph traversal)
- Cross-org parent validation (requires join)
- Complex status transition rules (simplified for now)

These can be added incrementally without breaking existing code.

## Integration with Previous Phases

- **Phase 2** - SQL validation still enforced
- **Phase 3** - Scope boundaries still respected
- **Phase 4** - Adds business rule layer on top

All phases work together in validation pipeline.
