# Organization Table Removal Migration Guide

## Overview

This migration removes the `Organization` model from the database schema while maintaining tenant isolation through `orgId` columns. The system now uses proxy authentication instead of database-backed organizations.

## What Changed

### 1. **Prisma Schema Changes**
- ✅ Removed `Organization` model entirely
- ✅ Removed all foreign key relations to `Organization`
- ✅ Kept `orgId` as plain `BigInt` columns on all models
- ✅ Tenant isolation still works via `orgId` filtering

### 2. **Authentication Changes**
- ✅ Added `proxyAuthMiddleware` for production proxy auth
- ✅ Kept `mockAuthMiddleware` for development
- ✅ Environment-based switch via `AUTH_MODE` env variable
- ✅ Backward compatible with existing `req.user` contract

### 3. **Database Migration**
- ✅ Drops foreign key constraints
- ✅ Drops `organizations` table
- ✅ Adds indexes on `org_id` for performance
- ✅ Does NOT drop `org_id` columns (data preserved)

## Migration Steps

### Step 1: Backup Database (CRITICAL)
```bash
# Create a backup before running migration
pg_dump -h your-host -U your-user -d your-database > backup_before_org_removal.sql
```

### Step 2: Run Prisma Migration
```bash
# Generate Prisma client with new schema
npx prisma generate

# Apply migration to database
npx prisma migrate deploy
```

### Step 3: Verify Migration
```sql
-- Check that organizations table is gone
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'organizations';
-- Should return 0 rows

-- Verify org_id columns still exist
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'categories' AND column_name = 'org_id';
-- Should return: org_id | bigint

-- Check foreign key constraints are removed
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name IN ('categories', 'custom_field_meta_data', 'system_prompts')
AND constraint_type = 'FOREIGN KEY' AND constraint_name LIKE '%org_id%';
-- Should return 0 rows
```

### Step 4: Test Application

#### Test with Mock Auth (Default)
```bash
# Start server with mock auth (default)
npm run dev

# Or explicitly set
AUTH_MODE=mock npm run dev
```

#### Test with Proxy Auth
```bash
# Start server with proxy auth
AUTH_MODE=proxy npm run dev
```

## Environment Variables

### Required for Proxy Auth
```env
AUTH_MODE=proxy  # Use 'mock' for development, 'proxy' for production
```

### Optional (for development)
```env
AUTH_MODE=mock   # Default - uses hardcoded user ID 1, org ID 1
```

## Code Impact

### ✅ No Changes Needed
- Controllers continue to use `req.user.org_id` and `req.user.id`
- Services continue to filter by `orgId`
- All existing APIs work unchanged
- Event system continues to work
- System prompt matching continues to work
- RAG system continues to work

### ✅ What Still Works
```typescript
// Controllers (NO CHANGES)
const orgId = BigInt(req.user!.org_id);
const userId = BigInt(req.user!.id);

// Services (NO CHANGES)
await prisma.category.findMany({
  where: { orgId }  // Tenant isolation still works
});

// Events (NO CHANGES)
await domainEventDispatcher.emit(
  DomainEventDispatcher.workItemEvent(...)
);
```

## Rollback Plan

If you need to rollback:

### Step 1: Restore Database Backup
```bash
psql -h your-host -U your-user -d your-database < backup_before_org_removal.sql
```

### Step 2: Revert Prisma Schema
```bash
git revert <commit-hash>
npx prisma generate
```

### Step 3: Revert Server Code
```bash
# Remove proxy auth import from server.ts
# Restore Organization model in schema.prisma
```

## Verification Checklist

After migration, verify:

- [ ] Server starts successfully
- [ ] `npx prisma generate` runs without errors
- [ ] All API endpoints return data correctly
- [ ] Tenant isolation works (users only see their org's data)
- [ ] Work items can be created/updated/deleted
- [ ] Custom fields work correctly
- [ ] System prompts match events correctly
- [ ] Domain events are emitted correctly
- [ ] No references to `prisma.organization` in code

## Testing Commands

```bash
# Test category creation
curl -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -d '{"keyName": "test", "name": "Test Category"}'

# Test work item creation
curl -X POST http://localhost:3000/work-items \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Item", "categoryId": "4"}'

# Test system prompts
curl http://localhost:3000/system-prompts
```

## Architecture After Migration

```
┌─────────────────────────────────────────────────────────────┐
│                    Proxy Auth Service                       │
│              (External - validates tokens)                  │
└─────────────────────┬───────────────────────────────────────┘
                      │ JWT Token
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              proxyAuthMiddleware                            │
│  - Validates token                                          │
│  - Extracts userId, orgId                                   │
│  - Populates req.user = { id, org_id }                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Controllers                               │
│  - Extract orgId from req.user.org_id                      │
│  - Pass to services                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services                                 │
│  - Filter all queries by orgId                             │
│  - Tenant isolation maintained                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database                                  │
│  - No organizations table                                   │
│  - orgId columns remain as BigInt                          │
│  - No foreign key constraints                               │
└─────────────────────────────────────────────────────────────┘
```

## Success Criteria

✅ App runs with `AUTH_MODE=mock`  
✅ App runs with `AUTH_MODE=proxy`  
✅ Prisma client generates successfully  
✅ No runtime reference to `Organization`  
✅ All APIs still work  
✅ `orgId` continues to scope all data  
✅ Event system still works  
✅ System prompt matching still works  
✅ RAG system still works  
✅ Tenant isolation is correct  

## Support

If you encounter issues:
1. Check server logs for errors
2. Verify Prisma client was regenerated
3. Ensure database migration completed
4. Check that `AUTH_MODE` is set correctly
5. Verify no code references `prisma.organization`

---

**Migration Date**: February 3, 2026  
**Status**: Ready for deployment  
**Breaking Changes**: None (backward compatible)
