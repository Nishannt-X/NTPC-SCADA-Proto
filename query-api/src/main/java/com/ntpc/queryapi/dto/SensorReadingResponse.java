package com.ntpc.queryapi.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;

/**
 * Response DTO for sensor readings — matches the shared contract.
 * Implements Serializable for Redis cache storage.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorReadingResponse implements Serializable {

    private String sensorId;
    private String unit;
    private String sensorType;
    private double value;
    private String unitOfMeasure;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    private Instant timestamp;
}
