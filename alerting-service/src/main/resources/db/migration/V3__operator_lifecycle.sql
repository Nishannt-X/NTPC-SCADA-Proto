-- V3: Add Operator Lifecycle columns to alerts
-- Owned by alerting-service

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(50) NULL;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ NULL;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS notes TEXT NULL;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS suppressed_until TIMESTAMPTZ NULL;

-- Index to quickly find suppressed alerts
CREATE INDEX IF NOT EXISTS idx_alerts_suppressed ON alerts (sensor_id, suppressed_until) WHERE suppressed_until IS NOT NULL;
