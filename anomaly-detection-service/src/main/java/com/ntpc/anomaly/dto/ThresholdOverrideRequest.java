package com.ntpc.anomaly.dto;

import lombok.Data;

@Data
public class ThresholdOverrideRequest {
    private String sensorId;
    private String sensorType;
    private Double newWarn;
    private Double newCrit;
}
