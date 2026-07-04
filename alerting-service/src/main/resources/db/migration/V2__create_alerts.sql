-- V2: Create alerts table
-- This migration is owned by the alerting-service

CREATE TABLE IF NOT EXISTS alerts (
    alert_id     UUID PRIMARY KEY,
    sensor_id    VARCHAR(64)      NOT NULL,
    unit         VARCHAR(16)      NOT NULL,
    sensor_type  VARCHAR(32)      NOT NULL,
    value        DOUBLE PRECISION NOT NULL,
    threshold    DOUBLE PRECISION NOT NULL,
    severity     VARCHAR(16)      NOT NULL,
    message      TEXT             NOT NULL,
    triggered_at TIMESTAMPTZ      NOT NULL,
    last_seen_at TIMESTAMPTZ      NOT NULL,
    resolved_at  TIMESTAMPTZ      NULL
);

-- Index for quickly finding active (unresolved) alerts by sensor
CREATE INDEX IF NOT EXISTS idx_alerts_active
    ON alerts (sensor_id, severity) WHERE resolved_at IS NULL;

-- Index for historical alert queries
CREATE INDEX IF NOT EXISTS idx_alerts_history
    ON alerts (triggered_at DESC);
