-- V2: Create audit_logs and threshold_overrides
-- Owned by query-api

CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    username   VARCHAR(50) NOT NULL,
    action     VARCHAR(100) NOT NULL,
    target     VARCHAR(100) NOT NULL,
    details    TEXT,
    timestamp  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS threshold_overrides (
    id          BIGSERIAL PRIMARY KEY,
    sensor_id   VARCHAR(64) NOT NULL,
    sensor_type VARCHAR(32) NOT NULL,
    new_warn    DOUBLE PRECISION NOT NULL,
    new_crit    DOUBLE PRECISION NOT NULL,
    reason      TEXT,
    created_by  VARCHAR(50) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_threshold_overrides_active ON threshold_overrides (sensor_id, expires_at);
