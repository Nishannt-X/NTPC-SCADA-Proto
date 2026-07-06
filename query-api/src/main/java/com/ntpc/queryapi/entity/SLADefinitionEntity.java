package com.ntpc.queryapi.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sla_definitions")
@Data
public class SLADefinitionEntity {
    @Id @Column(name = "sla_id") private UUID slaId;
    @Column(name = "alert_severity", nullable = false) private String alertSeverity;
    @Column(name = "unit") private String unit;
    @Column(name = "sensor_type") private String sensorType;
    @Column(name = "ack_required_minutes") private Integer ackRequiredMinutes;
    @Column(name = "resolution_required_minutes") private Integer resolutionRequiredMinutes;
    @Column(name = "escalate_if_not_acked_minutes") private Integer escalateIfNotAckedMinutes;
    @Column(name = "escalate_if_not_resolved_minutes") private Integer escalateIfNotResolvedMinutes;
    @Column(name = "escalate_to_role") private String escalateToRole;
    @Column(name = "active") private Boolean active;
}
