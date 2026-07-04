-- V1: Create sensor_readings hypertable for TimescaleDB
-- This migration is owned by the ingestion-service

CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE IF NOT EXISTS sensor_readings (
    id          BIGSERIAL,
    sensor_id   VARCHAR(64)      NOT NULL,
    unit        VARCHAR(16)      NOT NULL,
    sensor_type VARCHAR(32)      NOT NULL,
    value       DOUBLE PRECISION NOT NULL,
    unit_of_measure VARCHAR(16)  NOT NULL,
    reading_time TIMESTAMPTZ     NOT NULL
);

-- Convert to TimescaleDB hypertable for optimized time-series queries
SELECT create_hypertable('sensor_readings', 'reading_time', if_not_exists => TRUE);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sensor_readings_unit_time
    ON sensor_readings (unit, reading_time DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_time
    ON sensor_readings (sensor_id, reading_time DESC);
