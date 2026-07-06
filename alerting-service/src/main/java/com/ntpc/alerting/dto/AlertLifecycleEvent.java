package com.ntpc.alerting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertLifecycleEvent {
    private UUID alertId;
    private String sensorId;
    private String eventType; // e.g. ALERT_CREATED, ALERT_RESOLVED, ALERT_ACKNOWLEDGED, ALERT_SUPPRESSED
    private String severity;
    private String details;
    private Instant timestamp;
}
