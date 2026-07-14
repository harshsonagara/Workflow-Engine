-- ============================================================================
-- V2: Add columns that were added after initial schema creation.
--     All ADD COLUMN IF NOT EXISTS so this is safe to re-run.
-- ============================================================================

-- Optimistic locking on instance and task
ALTER TABLE workflow.instance ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE workflow.task     ADD COLUMN IF NOT EXISTS row_version BIGINT NOT NULL DEFAULT 0;

-- Task lifecycle tracking columns
ALTER TABLE workflow.task ADD COLUMN IF NOT EXISTS claimed_by    VARCHAR(100);
ALTER TABLE workflow.task ADD COLUMN IF NOT EXISTS claimed_at    TIMESTAMPTZ;
ALTER TABLE workflow.task ADD COLUMN IF NOT EXISTS completed_by  VARCHAR(100);
ALTER TABLE workflow.task ADD COLUMN IF NOT EXISTS completed_at  TIMESTAMPTZ;
ALTER TABLE workflow.task ADD COLUMN IF NOT EXISTS assigned_at   TIMESTAMPTZ;
ALTER TABLE workflow.task ADD COLUMN IF NOT EXISTS tenant_id     VARCHAR(100);

-- Richer audit log columns
ALTER TABLE workflow.audit_log ADD COLUMN IF NOT EXISTS performed_by_name VARCHAR(255);
ALTER TABLE workflow.audit_log ADD COLUMN IF NOT EXISTS node_label         VARCHAR(255);
ALTER TABLE workflow.audit_log ADD COLUMN IF NOT EXISTS event_type         VARCHAR(100);
ALTER TABLE workflow.audit_log ADD COLUMN IF NOT EXISTS source_node_id     VARCHAR(100);
ALTER TABLE workflow.audit_log ADD COLUMN IF NOT EXISTS target_node_id     VARCHAR(100);
ALTER TABLE workflow.audit_log ADD COLUMN IF NOT EXISTS event_status       VARCHAR(50);
ALTER TABLE workflow.audit_log ADD COLUMN IF NOT EXISTS context_data       JSONB;
ALTER TABLE workflow.audit_log ADD COLUMN IF NOT EXISTS tenant_id          VARCHAR(100);
