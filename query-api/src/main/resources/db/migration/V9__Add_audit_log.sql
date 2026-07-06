-- In the current DB, `audit_logs` exists. We rename it to `audit_log` per prompt.
ALTER TABLE audit_logs RENAME TO audit_log;
ALTER TABLE audit_log RENAME COLUMN username TO actor;
ALTER TABLE audit_log RENAME COLUMN target TO resource_id;
ALTER TABLE audit_log RENAME COLUMN action TO action_type;

-- Need to add missing columns from the prompt
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_role VARCHAR(32) NOT NULL DEFAULT 'ROLE_OPERATOR';
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS action_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS resource_type VARCHAR(64) NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS previous_state JSONB;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS new_state JSONB;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS session_id VARCHAR(128);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS unit VARCHAR(16);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor, action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type, action_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
