package com.ntpc.simulator.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Shared data contract for sensor readings.
 * Field names must match exactly across all services.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorReading {

    private String sensorId;

    private String unit;  // UNIT_1 | UNIT_2

    private String sensorType;  // TEMPERATURE | PRESSURE | VIBRATION | RPM | LOAD

    private double value;

    private String unitOfMeasure;  // °C, bar, mm, rpm, %

    @JsonFormat(shape = JsonFormat.Shape.STRING, timezone = "UTC")
    private Instant timestamp;
}
