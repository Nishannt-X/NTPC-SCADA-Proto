package com.ntpc.queryapi.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sensor_correlations")
@Data
public class SensorCorrelationEntity {
    @Id @Column(name = "correlation_id") private UUID correlationId;
    @Column(name = "name", nullable = false) private String name;
    @Column(name = "description") private String description;
    @Column(name = "trigger_sensor_id", nullable = false) private String triggerSensorId;
    @Column(name = "trigger_threshold") private String triggerThreshold;
    @Column(name = "diagnosis") private String diagnosis;
    @Column(name = "severity_escalation") private String severityEscalation;
    @Column(name = "may_indicate_maintenance_issue") private Boolean mayIndicateMaintenanceIssue;
    @Column(name = "maintenance_alert") private String maintenanceAlert;
}
