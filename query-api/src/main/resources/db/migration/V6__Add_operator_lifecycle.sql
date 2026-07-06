-- V6__Add_operator_lifecycle.sql
-- RENAME & EXTEND existing table
ALTER TABLE alerts RENAME TO alert_events;
-- Rename columns to match the new spec
ALTER TABLE alert_events RENAME COLUMN notes TO ack_notes;
ALTER TABLE alert_events RENAME COLUMN triggered_at TO fired_at;

-- Add remaining operator lifecycle columns
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS suppressed_at TIMESTAMPTZ NULL;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS suppressed_by VARCHAR(50) NULL;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS suppression_reason TEXT NULL;

-- Resolution tracking
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(50) NULL;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(50) NULL;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS resolution_notes TEXT NULL;

-- SLA tracking
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS first_breach_at TIMESTAMPTZ NULL;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS ack_deadline TIMESTAMPTZ NULL;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS resolution_deadline TIMESTAMPTZ NULL;

-- Escalation
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS escalated BOOLEAN DEFAULT FALSE;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ NULL;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS escalated_to_role VARCHAR(50) NULL;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS escalation_reason TEXT NULL;

ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE alert_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_alert_events_unit_severity ON alert_events(unit, severity, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_events_acknowledged ON alert_events(acknowledged_at, acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_alert_events_resolved ON alert_events(resolved_at, resolution_type);
CREATE INDEX IF NOT EXISTS idx_alert_events_sla ON alert_events(ack_deadline, resolution_deadline);
