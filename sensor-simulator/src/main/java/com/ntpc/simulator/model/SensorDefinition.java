package com.ntpc.simulator.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

/**
 * Immutable definition of a virtual sensor.
 * Defines the sensor's identity, baseline operating parameters, and physical bounds.
 */
@Data
@Builder
@AllArgsConstructor
public class SensorDefinition {

    private final String sensorId;        // e.g. U1-TEMP-01
    private final String unit;            // UNIT_1 or UNIT_2
    private final String sensorType;      // TEMPERATURE, PRESSURE, VIBRATION, RPM, LOAD
    private final double baselineValue;   // Normal operating value
    private final String unitOfMeasure;   // °C, bar, mm, rpm, %
    private final double minBound;        // Physical minimum
    private final double maxBound;        // Physical maximum
    private final double warnThreshold;   // Warning limit
    private final double critThreshold;   // Critical limit
    private final String segment;
}
