package com.ntpc.ingestion.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Shared data contract for sensor readings.
 * Identical to the DTO in sensor-simulator.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorReading {

    private String sensorId;
    private String unit;
    private String sensorType;
    private double value;
    private String unitOfMeasure;

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    private Instant timestamp;
}
