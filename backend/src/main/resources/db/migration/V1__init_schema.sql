-- ============================================================================
-- V1: Full workflow schema baseline.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS workflow;

-- ── workflow.master ──────────────────────────────────────────────────────────
CREATE TABLE workflow.master (
    id                BIGSERIAL PRIMARY KEY,
    workflow_name     VARCHAR(200)             NOT NULL,
    code              VARCHAR(100),
    tenant_id         VARCHAR(100),
    is_active         BOOLEAN                  NOT NULL DEFAULT TRUE,
    is_deleted        BOOLEAN                  NOT NULL DEFAULT FALSE,
    created_by        INTEGER,
    updated_by        INTEGER,
    created_at        TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ              NOT NULL DEFAULT NOW(),

    CONSTRAINT ux_master_code_tenant UNIQUE (code, tenant_id)
);

CREATE INDEX ix_workflow_master_name   ON workflow.master (workflow_name);
CREATE INDEX ix_workflow_master_code   ON workflow.master (code);
CREATE INDEX ix_workflow_master_tenant ON workflow.master (tenant_id);

-- ── workflow.version ─────────────────────────────────────────────────────────
CREATE TABLE workflow.version (
    id                  BIGSERIAL PRIMARY KEY,
    workflow_master_id  BIGINT                   NOT NULL REFERENCES workflow.master (id) ON DELETE CASCADE,
    version_name        VARCHAR(200)             NOT NULL,
    definition_json     JSONB                    NOT NULL DEFAULT '{}',
    is_active           BOOLEAN                  NOT NULL DEFAULT FALSE,
    is_deleted          BOOLEAN                  NOT NULL DEFAULT FALSE,
    created_by          INTEGER,
    updated_by          INTEGER,
    created_at          TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ              NOT NULL DEFAULT NOW(),

    CONSTRAINT ux_workflow_versions_unique UNIQUE (workflow_master_id, version_name)
);

-- ── workflow.instance ────────────────────────────────────────────────────────
CREATE TABLE workflow.instance (
    id                          BIGSERIAL PRIMARY KEY,
    workflow_master_id          BIGINT                   REFERENCES workflow.master (id),
    workflow_version_id         BIGINT                   REFERENCES workflow.version (id),
    entity_type                 VARCHAR(100),
    entity_id                   VARCHAR(100),
    business_key                VARCHAR(100)             NOT NULL,
    current_node_id             VARCHAR(100)             NOT NULL,
    status                      VARCHAR(255)             NOT NULL DEFAULT 'running',
    outcome                     VARCHAR(50),
    variables                   JSONB                    NOT NULL DEFAULT '{}',
    metadata                    JSONB                    NOT NULL DEFAULT '{}',
    created_by                  VARCHAR(100),
    created_at                  TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
    completed_at                TIMESTAMPTZ,
    parent_workflow_instance_id BIGINT                   REFERENCES workflow.instance (id),
    parent_node_id              VARCHAR(100)
);

CREATE INDEX idx_instance_status       ON workflow.instance (status);
CREATE INDEX idx_instance_entity       ON workflow.instance (entity_type, entity_id);
CREATE INDEX idx_instance_business_key ON workflow.instance (business_key);

CREATE UNIQUE INDEX ux_instance_business_key_active
    ON workflow.instance (business_key)
    WHERE status NOT IN ('completed', 'cancelled');

-- ── workflow.task ────────────────────────────────────────────────────────────
CREATE TABLE workflow.task (
    id                      BIGSERIAL PRIMARY KEY,
    workflow_instance_id    BIGINT       NOT NULL REFERENCES workflow.instance (id) ON DELETE CASCADE,
    node_id                 VARCHAR(100) NOT NULL,
    assignment_type         VARCHAR(50)  NOT NULL,
    assignment_value        VARCHAR(255),
    resolved_assigned_to    VARCHAR(100),
    resolved_assigned_role  VARCHAR(100),
    original_assigned_to    VARCHAR(100),
    original_assigned_role  VARCHAR(100),
    status                  VARCHAR(250) NOT NULL DEFAULT 'pending',
    remarks                 TEXT,
    metadata                JSONB        NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    acted_at                TIMESTAMPTZ,
    action_taken            BOOLEAN               DEFAULT FALSE,
    sla_deadline            TIMESTAMPTZ,
    sla_breached            BOOLEAN      NOT NULL DEFAULT FALSE,
    sla_breached_at         TIMESTAMPTZ,
    sla_escalation_type     VARCHAR(50),
    is_escalated            BOOLEAN      NOT NULL DEFAULT FALSE,
    allow_edit              BOOLEAN               DEFAULT FALSE
);

CREATE INDEX idx_tasks_instance             ON workflow.task (workflow_instance_id);
CREATE INDEX idx_tasks_resolved_assigned_to ON workflow.task (resolved_assigned_to);
CREATE INDEX idx_tasks_status               ON workflow.task (status);
CREATE INDEX idx_tasks_assignment_type      ON workflow.task (assignment_type);

-- ── workflow.audit_log ───────────────────────────────────────────────────────
CREATE TABLE workflow.audit_log (
    id                      BIGSERIAL PRIMARY KEY,
    workflow_instance_id    BIGINT       NOT NULL REFERENCES workflow.instance (id) ON DELETE CASCADE,
    action                  VARCHAR(255) NOT NULL,
    performed_by            VARCHAR(100),
    remarks                 TEXT,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_instance ON workflow.audit_log (workflow_instance_id);

-- ── workflow.process_mapping ─────────────────────────────────────────────────
CREATE TABLE workflow.process_mapping (
    id                   BIGSERIAL PRIMARY KEY,
    process_code         VARCHAR(100) NOT NULL,
    process_name         VARCHAR(200) NOT NULL,
    description          VARCHAR(500),
    workflow_master_id   BIGINT       NOT NULL REFERENCES workflow.master (id) ON DELETE RESTRICT,
    entity_type          VARCHAR(100),
    business_key_prefix  VARCHAR(100),
    assignment_config    TEXT,
    is_active            BOOLEAN               DEFAULT TRUE,

    CONSTRAINT ux_process_mapping_code UNIQUE (process_code)
);

-- ── workflow.role_registry ───────────────────────────────────────────────────
CREATE TABLE workflow.role_registry (
    id          BIGSERIAL PRIMARY KEY,
    role_id     VARCHAR(100) NOT NULL,
    label       VARCHAR(200),
    type        VARCHAR(20)  NOT NULL DEFAULT 'role',
    source      VARCHAR(100) NOT NULL DEFAULT 'GLOBAL',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT ux_role_registry_role_source UNIQUE (role_id, source)
);

CREATE INDEX ix_role_registry_source ON workflow.role_registry (source);
CREATE INDEX ix_role_registry_type   ON workflow.role_registry (type);
