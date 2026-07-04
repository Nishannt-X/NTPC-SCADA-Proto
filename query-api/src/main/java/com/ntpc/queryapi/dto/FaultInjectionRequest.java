package com.ntpc.queryapi.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request body for the fault injection proxy endpoint.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FaultInjectionRequest {

    private String unit;
    private String sensorType;
    private String magnitude;
    private int durationCycles;
}
