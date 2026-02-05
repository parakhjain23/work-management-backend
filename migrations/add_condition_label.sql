-- Add condition_label column to system_prompts table
-- This stores the user's original natural language condition text

ALTER TABLE system_prompts 
ADD COLUMN condition_label TEXT;

-- Add comment for documentation
COMMENT ON COLUMN system_prompts.condition_label IS 'User-provided natural language condition (when to trigger)';
