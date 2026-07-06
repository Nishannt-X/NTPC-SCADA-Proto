package com.ntpc.queryapi.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "threshold_definitions")
@Data
public class ThresholdDefinitionEntity {
    @Id @Column(name = "threshold_id") private UUID thresholdId;
    @Column(name = "sensor_id", nullable = false) private String sensorId;
    @Column(name = "warning_threshold", nullable = false) private Double warningThreshold;
    @Column(name = "critical_threshold", nullable = false) private Double criticalThreshold;
    @Column(name = "rationale") private String rationale;
    @Column(name = "data_source") private String dataSource;
    @Column(name = "equipment_absolute_max") private Double equipmentAbsoluteMax;
    @Column(name = "equipment_absolute_max_reason") private String equipmentAbsoluteMaxReason;
    @Column(name = "safety_factor") private Double safetyFactor;
    @Column(name = "historical_max_ever") private Double historicalMaxEver;
    @Column(name = "historical_min_ever") private Double historicalMinEver;
    @Column(name = "historical_mean") private Double historicalMean;
    @Column(name = "historical_stddev") private Double historicalStddev;
    @Column(name = "historical_sample_size") private Integer historicalSampleSize;
    @Column(name = "active_from", nullable = false) private Instant activeFrom;
    @Column(name = "active_until") private Instant activeUntil;
    @Column(name = "created_by", nullable = false) private String createdBy;
    @Column(name = "reviewed_by") private String reviewedBy;
    @Column(name = "last_review_date") private Instant lastReviewDate;
}
