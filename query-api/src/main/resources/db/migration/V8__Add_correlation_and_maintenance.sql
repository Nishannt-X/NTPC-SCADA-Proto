CREATE TABLE IF NOT EXISTS sensor_correlations (
  correlation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(128) NOT NULL,
  description TEXT,
  
  trigger_sensor_id VARCHAR(64) NOT NULL,
  trigger_threshold VARCHAR(32),
  
  related_sensors TEXT[] NOT NULL,
  
  diagnosis TEXT,
  expected_trends JSONB,
  
  recommended_actions TEXT[],
  severity_escalation VARCHAR(32),
  
  may_indicate_maintenance_issue BOOLEAN,
  maintenance_alert TEXT,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sensor_correlations_trigger ON sensor_correlations(trigger_sensor_id);

CREATE TABLE IF NOT EXISTS sla_definitions (
  sla_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  alert_severity VARCHAR(32) NOT NULL,
  unit VARCHAR(16),
  sensor_type VARCHAR(32),
  
  ack_required_minutes INT,
  resolution_required_minutes INT,
  
  escalate_if_not_acked_minutes INT,
  escalate_if_not_resolved_minutes INT,
  escalate_to_role VARCHAR(64),
  
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sla_violations (
  violation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL,
  sla_id UUID NOT NULL,
  
  violation_type VARCHAR(64) NOT NULL,
  
  expected_time TIMESTAMPTZ,
  actual_time TIMESTAMPTZ,
  minutes_late INT,
  
  reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sla_violations_alert ON sla_violations(alert_id);

CREATE TABLE IF NOT EXISTS maintenance_schedules (
  maintenance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id VARCHAR(64) NOT NULL REFERENCES sensor_definitions(sensor_id),
  
  maintenance_type VARCHAR(64) NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  
  completed_at TIMESTAMPTZ NULL,
  completed_by VARCHAR(64),
  
  notes TEXT,
  before_values JSONB,
  after_values JSONB,
  
  next_due_date TIMESTAMPTZ,
  
  status VARCHAR(32) DEFAULT 'SCHEDULED',
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_sensor_due ON maintenance_schedules(sensor_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_overdue ON maintenance_schedules(scheduled_date) WHERE status = 'OVERDUE';

CREATE TABLE IF NOT EXISTS shared_systems (
  system_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(128) NOT NULL,
  description TEXT,
  
  units_affected TEXT[] NOT NULL,
  
  health_sensors TEXT[] NOT NULL,
  
  failure_description TEXT,
  consequences_if_failed TEXT,
  
  critical_for_units TEXT[],
  recommended_action_on_failure TEXT,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shared_systems_units ON shared_systems USING GIN(units_affected);

CREATE TABLE IF NOT EXISTS shift_handovers (
  handover_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  shift_number INT,
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ NOT NULL,
  
  operator_outgoing VARCHAR(64) NOT NULL,
  operator_incoming VARCHAR(64) NOT NULL,
  
  unit1_load_mw DOUBLE PRECISION,
  unit2_load_mw DOUBLE PRECISION,
  plant_total_load_mw DOUBLE PRECISION,
  
  active_alerts_count INT,
  resolved_alerts_count INT,
  critical_alerts_count INT,
  
  active_overrides JSONB,
  
  incidents_summary TEXT,
  incidents JSONB,
  
  outgoing_notes TEXT,
  incoming_acknowledgment TEXT,
  
  outstanding_issues TEXT[],
  attention_flags TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_shift_handovers_date ON shift_handovers(shift_end DESC);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_operators ON shift_handovers(operator_outgoing, operator_incoming);
