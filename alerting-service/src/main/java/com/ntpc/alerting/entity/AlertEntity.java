package com.ntpc.alerting.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "alerts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertEntity {

    @Id
    @Column(name = "alert_id")
    private UUID alertId;

    @Column(name = "sensor_id", nullable = false)
    private String sensorId;

    @Column(name = "unit", nullable = false)
    private String unit;

    @Column(name = "sensor_type", nullable = false)
    private String sensorType;

    @Column(name = "value", nullable = false)
    private Double value;

    @Column(name = "threshold", nullable = false)
    private Double threshold;

    @Column(name = "severity", nullable = false)
    private String severity;

    @Column(name = "message", nullable = false)
    private String message;

    @Column(name = "triggered_at", nullable = false)
    private Instant triggeredAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;
}
