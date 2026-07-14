CREATE TABLE workflow.app_user (
    id            BIGSERIAL    PRIMARY KEY,
    email         VARCHAR(200) NOT NULL,
    full_name     VARCHAR(200) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role          VARCHAR(50)  NOT NULL DEFAULT 'user',
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ,
    CONSTRAINT ux_app_user_email UNIQUE (email)
);
