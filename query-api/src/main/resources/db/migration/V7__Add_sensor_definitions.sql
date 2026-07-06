CREATE TABLE IF NOT EXISTS sensor_definitions (
  sensor_id VARCHAR(64) PRIMARY KEY,
  unit VARCHAR(16) NOT NULL,
  sensor_type VARCHAR(32) NOT NULL,
  
  -- NEW: Physical location
  location_category VARCHAR(64) NOT NULL,
  location_section VARCHAR(64) NOT NULL,
  location_name VARCHAR(128) NOT NULL,
  
  -- NEW: Equipment this sensor monitors
  equipment_id VARCHAR(64),
  equipment_type VARCHAR(64),
  
  -- NEW: Physical location (3D coords or description)
  physical_location_description TEXT,
  coordinates_x DOUBLE PRECISION,
  coordinates_y DOUBLE PRECISION,
  coordinates_z DOUBLE PRECISION,
  
  -- NEW: Sensor hardware specs
  sensor_model VARCHAR(128),
  sensor_range_min DOUBLE PRECISION,
  sensor_range_max DOUBLE PRECISION,
  sensor_accuracy DOUBLE PRECISION,
  
  -- NEW: Maintenance & calibration
  installation_date TIMESTAMPTZ,
  last_calibration_date TIMESTAMPTZ,
  next_calibration_due TIMESTAMPTZ,
  calibration_interval_months INT,
  calibration_accuracy DOUBLE PRECISION,
  
  -- NEW: Criticality
  is_critical BOOLEAN DEFAULT FALSE,
  failure_mode TEXT,
  
  -- NEW: Related sensors (correlations)
  related_sensors TEXT[],
  
  -- Status tracking
  is_active BOOLEAN DEFAULT TRUE,
  status VARCHAR(32) DEFAULT 'OPERATIONAL',
  status_since TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sensor_definitions_unit_location ON sensor_definitions(unit, location_category);
CREATE INDEX IF NOT EXISTS idx_sensor_definitions_equipment ON sensor_definitions(equipment_id, equipment_type);
CREATE INDEX IF NOT EXISTS idx_sensor_definitions_calibration_due ON sensor_definitions(next_calibration_due);

CREATE TABLE IF NOT EXISTS threshold_definitions (
  threshold_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id VARCHAR(64) NOT NULL REFERENCES sensor_definitions(sensor_id),
  
  warning_threshold DOUBLE PRECISION NOT NULL,
  critical_threshold DOUBLE PRECISION NOT NULL,
  
  rationale TEXT,
  data_source VARCHAR(64),
  
  equipment_absolute_max DOUBLE PRECISION,
  equipment_absolute_max_reason TEXT,
  safety_factor DOUBLE PRECISION,
  
  historical_max_ever DOUBLE PRECISION,
  historical_min_ever DOUBLE PRECISION,
  historical_mean DOUBLE PRECISION,
  historical_stddev DOUBLE PRECISION,
  historical_sample_size INT,
  
  active_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active_until TIMESTAMPTZ NULL,
  created_by VARCHAR(64) NOT NULL,
  reviewed_by VARCHAR(64),
  last_review_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_threshold_definitions_sensor_active ON threshold_definitions(sensor_id, active_until DESC);

ALTER TABLE threshold_overrides ADD COLUMN IF NOT EXISTS original_warning DOUBLE PRECISION;
ALTER TABLE threshold_overrides ADD COLUMN IF NOT EXISTS original_critical DOUBLE PRECISION;
ALTER TABLE threshold_overrides RENAME COLUMN new_warn TO new_warning;
ALTER TABLE threshold_overrides RENAME COLUMN new_crit TO new_critical;
ALTER TABLE threshold_overrides RENAME COLUMN created_by TO initiated_by;
ALTER TABLE threshold_overrides ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE threshold_overrides ADD COLUMN IF NOT EXISTS duration_hours INT NOT NULL DEFAULT 24;
ALTER TABLE threshold_overrides ADD COLUMN IF NOT EXISTS auto_reverted_at TIMESTAMPTZ NULL;
ALTER TABLE threshold_overrides ADD COLUMN IF NOT EXISTS reverted_at TIMESTAMPTZ NULL;
ALTER TABLE threshold_overrides ADD COLUMN IF NOT EXISTS reverted_by VARCHAR(64) NULL;
ALTER TABLE threshold_overrides ADD COLUMN IF NOT EXISTS reversion_reason TEXT NULL;
ALTER TABLE threshold_overrides ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_threshold_overrides_sensor_active ON threshold_overrides(sensor_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_threshold_overrides_operator ON threshold_overrides(initiated_by, initiated_at DESC);
