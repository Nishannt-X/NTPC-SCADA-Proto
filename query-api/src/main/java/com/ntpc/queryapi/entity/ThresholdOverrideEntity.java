package com.ntpc.queryapi.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "threshold_overrides")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThresholdOverrideEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sensor_id", nullable = false)
    private String sensorId;

    @Column(name = "sensor_type", nullable = false)
    private String sensorType;

    @Column(name = "new_warn", nullable = false)
    private Double newWarn;

    @Column(name = "new_crit", nullable = false)
    private Double newCrit;

    @Column
    private String reason;

    @Column(name = "created_by", nullable = false)
    private String createdBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
