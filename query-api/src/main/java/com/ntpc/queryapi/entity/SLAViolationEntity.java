package com.ntpc.queryapi.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sla_violations")
@Data
public class SLAViolationEntity {
    @Id @Column(name = "violation_id") private UUID violationId;
    @Column(name = "alert_id", nullable = false) private UUID alertId;
    @Column(name = "sla_id", nullable = false) private UUID slaId;
    @Column(name = "violation_type", nullable = false) private String violationType;
    @Column(name = "expected_time") private Instant expectedTime;
    @Column(name = "actual_time") private Instant actualTime;
    @Column(name = "minutes_late") private Integer minutesLate;
    @Column(name = "reported_at") private Instant reportedAt;
}
