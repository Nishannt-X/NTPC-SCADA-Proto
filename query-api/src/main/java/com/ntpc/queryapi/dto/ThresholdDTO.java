package com.ntpc.queryapi.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ThresholdDTO {
    private String sensorId;
    private Double warning;
    private Double critical;
    private boolean isOverrideActive;
}
