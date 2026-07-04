package com.ntpc.anomaly.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Alert DTO matching the shared Alert contract.
 * Published to the sensor-alerts Kafka topic.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Alert {

    private String alertId;
    private String sensorId;
    private String unit;
    private String sensorType;
    private double value;
    private double threshold;
    private String severity;   // WARNING | CRITICAL
    private String message;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    private Instant timestamp;
}
