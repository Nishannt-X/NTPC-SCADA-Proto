package com.ntpc.queryapi.dto;

import lombok.Data;

@Data
public class ResolveRequest {
    private String resolutionType; // MANUAL or AUTO
    private String notes;
    private String rootCause;
}
