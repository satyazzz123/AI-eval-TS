BEGIN;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE,
    display_name TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE oauth_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_username TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_oauth_identity
        UNIQUE (provider, provider_user_id)
);

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    client_type TEXT NOT NULL
        CHECK (client_type IN ('browser', 'api')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user_id
    ON sessions(user_id);

CREATE INDEX idx_sessions_expires_at
    ON sessions(expires_at);

CREATE TABLE oauth_transactions (
    state_hash TEXT PRIMARY KEY,
    client_type TEXT NOT NULL
        CHECK (client_type IN ('browser', 'api')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE user_roles (
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL
        REFERENCES roles(id) ON DELETE CASCADE,

    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id INTEGER NOT NULL
        REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL
        REFERENCES permissions(id) ON DELETE CASCADE,

    PRIMARY KEY (role_id, permission_id)
);

INSERT INTO roles (name, description)
VALUES
    ('admin', 'Administrative access'),
    ('member', 'Manage permitted resources'),
    ('viewer', 'Read-only access');

INSERT INTO permissions (name, description)
VALUES
    ('evaluation:read', 'Read evaluations'),
    ('evaluation:create', 'Create evaluations'),
    ('evaluation:update', 'Update evaluations'),
    ('evaluation:delete', 'Delete evaluations'),
    ('evaluation:run', 'Run evaluations'),
    ('model:read', 'Read model configurations'),
    ('model:create', 'Create model configurations'),
    ('model:update', 'Update model configurations'),
    ('model:delete', 'Delete model configurations'),
    ('user:manage', 'Manage application users');



ALTER TABLE evaluations
    ADD COLUMN user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE models
    ADD COLUMN user_id INTEGER
        REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_evaluations_user_id
    ON evaluations(user_id);

CREATE INDEX idx_models_user_id
    ON models(user_id);

COMMIT;