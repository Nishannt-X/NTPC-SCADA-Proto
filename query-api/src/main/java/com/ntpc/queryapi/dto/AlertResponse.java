package com.ntpc.queryapi.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;

/**
 * Response DTO for alerts — matches the shared Alert contract.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertResponse implements Serializable {

    private String alertId;
    private String sensorId;
    private String unit;
    private String sensorType;
    private double value;
    private double threshold;
    private String severity;
    private String message;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    private Instant timestamp;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    private Instant lastSeenAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    private Instant resolvedAt;

    private String acknowledgedBy;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    private Instant suppressedUntil;
}
