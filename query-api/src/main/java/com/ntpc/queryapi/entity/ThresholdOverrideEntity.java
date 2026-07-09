package com.ntpc.queryapi.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "threshold_overrides")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThresholdOverrideEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "sensor_id", nullable = false)
    private String sensorId;

    @Column(name = "sensor_type", nullable = false)
    private String sensorType;

    @Column(name = "original_warning")
    private Double originalWarning;

    @Column(name = "original_critical")
    private Double originalCritical;

    @Column(name = "new_warning", nullable = false)
    private Double newWarning;

    @Column(name = "new_critical", nullable = false)
    private Double newCritical;

    @Column(name = "initiated_by", nullable = false)
    private String initiatedBy;

    @Column(name = "initiated_at", insertable = false, updatable = false)
    private Instant initiatedAt;

    @Column(name = "reason", nullable = false)
    private String reason;

    @Column(name = "duration_hours", nullable = false)
    private Integer durationHours;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "auto_reverted_at")
    private Instant autoRevertedAt;

    @Column(name = "reverted_at")
    private Instant revertedAt;

    @Column(name = "reverted_by")
    private String revertedBy;

    @Column(name = "reversion_reason")
    private String reversionReason;

    @Column(name = "status")
    private String status;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
