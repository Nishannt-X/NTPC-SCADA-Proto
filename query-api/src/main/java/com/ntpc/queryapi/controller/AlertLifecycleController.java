package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.dto.AcknowledgeRequest;
import com.ntpc.queryapi.dto.SuppressRequest;
import com.ntpc.queryapi.dto.ThresholdOverrideRequest;
import com.ntpc.queryapi.entity.AlertEntity;
import com.ntpc.queryapi.entity.AuditLogEntity;
import com.ntpc.queryapi.entity.ThresholdOverrideEntity;
import com.ntpc.queryapi.repository.AlertRepository;
import com.ntpc.queryapi.repository.AuditLogRepository;
import com.ntpc.queryapi.repository.ThresholdOverrideRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class AlertLifecycleController {

    private final AlertRepository alertRepository;
    private final AuditLogRepository auditLogRepository;
    private final ThresholdOverrideRepository thresholdOverrideRepository;

    public AlertLifecycleController(AlertRepository alertRepository,
                                    AuditLogRepository auditLogRepository,
                                    ThresholdOverrideRepository thresholdOverrideRepository) {
        this.alertRepository = alertRepository;
        this.auditLogRepository = auditLogRepository;
        this.thresholdOverrideRepository = thresholdOverrideRepository;
    }

    private String getCurrentUser() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private void logAudit(String action, String target, String details) {
        AuditLogEntity log = AuditLogEntity.builder()
                .actor(getCurrentUser())
                .actorRole("ROLE_OPERATOR")
                .actionType(action)
                .resourceType("ALERT")
                .resourceId(target)
                .details(details)
                .build();
        auditLogRepository.save(log);
    }

    @PostMapping("/alerts/{alertId}/acknowledge")
    public ResponseEntity<?> acknowledgeAlert(@PathVariable UUID alertId, @RequestBody AcknowledgeRequest request) {
        AlertEntity alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        
        alert.setAcknowledgedBy(getCurrentUser());
        alert.setAcknowledgedAt(Instant.now());
        alert.setAckNotes(request.getNotes());
        alertRepository.save(alert);
        
        logAudit("ACKNOWLEDGE_ALERT", alertId.toString(), "Notes: " + request.getNotes());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/alerts/{alertId}/suppress")
    public ResponseEntity<?> suppressAlert(@PathVariable UUID alertId, @RequestBody SuppressRequest request) {
        AlertEntity alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        
        Instant suppressedUntil = Instant.now().plus(request.getDurationMinutes(), ChronoUnit.MINUTES);
        alert.setSuppressedUntil(suppressedUntil);
        alertRepository.save(alert);
        
        logAudit("SUPPRESS_ALERT", alertId.toString(), "Suppressed until: " + suppressedUntil);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/sensors/{sensorId}/override-threshold")
    public ResponseEntity<?> overrideThreshold(@PathVariable String sensorId, @RequestBody ThresholdOverrideRequest request) {
        Instant expiresAt = Instant.now().plus(request.getDurationHours(), ChronoUnit.HOURS);
        
        ThresholdOverrideEntity override = ThresholdOverrideEntity.builder()
                .sensorId(sensorId)
                .sensorType(request.getSensorType())
                .newWarning(request.getNewWarn())
                .newCritical(request.getNewCrit())
                .reason(request.getReason())
                .initiatedBy(getCurrentUser())
                .expiresAt(expiresAt)
                .build();
                
        thresholdOverrideRepository.save(override);
        logAudit("OVERRIDE_THRESHOLD", sensorId, "Warn: " + request.getNewWarn() + " Crit: " + request.getNewCrit() + " Reason: " + request.getReason());
        
        // Notify anomaly-detection-service (runs on port 8083 locally/docker)
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String anomalyServiceUrl = "http://anomaly-detection-service:8083/api/internal/threshold-overrides";
            
            // For local development where we might run everything on localhost:
            if (System.getenv("ANOMALY_DETECTION_URL") != null) {
                anomalyServiceUrl = System.getenv("ANOMALY_DETECTION_URL") + "/api/internal/threshold-overrides";
            }
            
            // Re-use the request object as the payload, plus inject sensorId
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("sensorId", sensorId);
            payload.put("sensorType", request.getSensorType());
            payload.put("newWarn", request.getNewWarn());
            payload.put("newCrit", request.getNewCrit());
            
            restTemplate.postForEntity(anomalyServiceUrl, payload, Void.class);
        } catch (Exception e) {
            System.err.println("Failed to notify anomaly-detection-service: " + e.getMessage());
        }
        
        return ResponseEntity.ok().build();
    }
}
