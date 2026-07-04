package com.ntpc.simulator.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for the fault injection endpoint.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FaultInjectionRequest {

    private String unit;          // UNIT_1 | UNIT_2
    private String sensorType;    // TEMPERATURE | PRESSURE | VIBRATION | RPM | LOAD
    private String magnitude;     // MODERATE | SEVERE
    private int durationCycles;   // Number of publish cycles the fault lasts
}
