-- Pre-DDL fixes: run before Hibernate ddl-auto=update on every startup.
-- Each statement ends with ;; so the DO $$ block's internal semicolons are not split.
-- Add new USING-cast fixes here whenever an entity column type changes.

-- Fix assignment_config: cast text → jsonb (Hibernate cannot emit USING clause itself)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'workflow'
      AND table_name   = 'process_mapping'
      AND column_name  = 'assignment_config'
      AND data_type   <> 'jsonb'
  ) THEN
    ALTER TABLE workflow.process_mapping
      ALTER COLUMN assignment_config TYPE jsonb USING assignment_config::jsonb;
    RAISE NOTICE 'pre-ddl: cast process_mapping.assignment_config to jsonb';
  END IF;
END $$;;
