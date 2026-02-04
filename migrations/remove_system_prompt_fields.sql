-- Migration: Remove priority, isActive, keyName, description from system_prompts
-- Make eventType nullable (optional)
-- Run this SQL manually, then run: npx prisma generate

-- Drop indexes that reference removed columns
DROP INDEX IF EXISTS idx_system_prompts_active;
DROP INDEX IF EXISTS idx_system_prompts_org_event;

-- Drop the old unique constraint
ALTER TABLE system_prompts DROP CONSTRAINT IF EXISTS system_prompts_orgId_keyName_key;

-- Remove columns
ALTER TABLE system_prompts DROP COLUMN IF EXISTS key_name;
ALTER TABLE system_prompts DROP COLUMN IF EXISTS description;
ALTER TABLE system_prompts DROP COLUMN IF EXISTS is_active;
ALTER TABLE system_prompts DROP COLUMN IF EXISTS priority;

-- Make eventType nullable (optional)
ALTER TABLE system_prompts ALTER COLUMN event_type DROP NOT NULL;

-- Add new unique constraint on orgId and name
ALTER TABLE system_prompts ADD CONSTRAINT system_prompts_orgId_name_key UNIQUE (org_id, name);

-- Recreate the composite index
CREATE INDEX idx_system_prompts_org_event ON system_prompts(org_id, event_type);
