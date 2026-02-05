-- Remove unique constraint on (org_id, name) from system_prompts table
-- This allows multiple system prompts with the same name within an organization

ALTER TABLE system_prompts 
DROP CONSTRAINT IF EXISTS system_prompts_org_id_name_key;

-- Add comment for documentation
COMMENT ON TABLE system_prompts IS 'System prompts can have duplicate names within the same organization';
