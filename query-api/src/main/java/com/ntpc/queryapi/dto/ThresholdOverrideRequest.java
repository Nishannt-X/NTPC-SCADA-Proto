package com.ntpc.queryapi.dto;

import lombok.Data;

@Data
public class ThresholdOverrideRequest {
    private String sensorType;
    private Double newWarn;
    private Double newCrit;
    private String reason;
    private Integer durationHours;
}
