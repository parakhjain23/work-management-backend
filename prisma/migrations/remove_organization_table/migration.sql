-- Drop foreign key constraints from tables that reference organizations
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_org_id_fkey";
ALTER TABLE "custom_field_meta_data" DROP CONSTRAINT IF EXISTS "custom_field_meta_data_org_id_fkey";
ALTER TABLE "system_prompts" DROP CONSTRAINT IF EXISTS "system_prompts_org_id_fkey";

-- Drop the organizations table
DROP TABLE IF EXISTS "organizations";

-- Add indexes on org_id columns for better query performance (tenant isolation)
CREATE INDEX IF NOT EXISTS "idx_categories_org_id" ON "categories"("org_id");
CREATE INDEX IF NOT EXISTS "idx_custom_field_meta_data_org_id" ON "custom_field_meta_data"("org_id");

-- Note: org_id columns remain as BigInt for tenant isolation
-- They are no longer foreign keys, just plain columns used for filtering
