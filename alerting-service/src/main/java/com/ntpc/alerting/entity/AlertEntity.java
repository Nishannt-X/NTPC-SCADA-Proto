package com.ntpc.alerting.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "alert_events")
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

    @Column(name = "message")
    private String message;

    @Column(name = "fired_at", nullable = false)
    private Instant firedAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    @Column(name = "first_breach_at")
    private Instant firstBreachAt;

    @Column(name = "ack_deadline")
    private Instant ackDeadline;

    @Column(name = "resolution_deadline")
    private Instant resolutionDeadline;

    @Column(name = "acknowledged_by")
    private String acknowledgedBy;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "ack_notes")
    private String ackNotes;

    @Column(name = "suppressed_until")
    private Instant suppressedUntil;

    @Column(name = "suppressed_at")
    private Instant suppressedAt;

    @Column(name = "suppressed_by")
    private String suppressedBy;

    @Column(name = "suppression_reason")
    private String suppressionReason;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolved_by")
    private String resolvedBy;

    @Column(name = "resolution_type")
    private String resolutionType;

    @Column(name = "resolution_notes")
    private String resolutionNotes;

    @Column(name = "escalated")
    private Boolean escalated;

    @Column(name = "escalated_at")
    private Instant escalatedAt;

    @Column(name = "escalated_to_role")
    private String escalatedToRole;

    @Column(name = "escalation_reason")
    private String escalationReason;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;
}
