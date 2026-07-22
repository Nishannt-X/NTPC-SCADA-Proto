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
@org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('OPERATOR', 'SHIFT_CHARGE_ENGINEER', 'MAINTENANCE', 'ADMIN')")
public class AlertLifecycleController {

    private final AlertRepository alertRepository;
    private final AuditLogRepository auditLogRepository;
    private final ThresholdOverrideRepository thresholdOverrideRepository;
    private final com.ntpc.queryapi.service.CorrelationService correlationService;
    private final com.ntpc.queryapi.service.SLAService slaService;
    private final org.springframework.kafka.core.KafkaTemplate<String, String> kafkaTemplate;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public AlertLifecycleController(AlertRepository alertRepository,
                                    AuditLogRepository auditLogRepository,
                                    ThresholdOverrideRepository thresholdOverrideRepository,
                                    com.ntpc.queryapi.service.CorrelationService correlationService,
                                    com.ntpc.queryapi.service.SLAService slaService,
                                    org.springframework.kafka.core.KafkaTemplate<String, String> kafkaTemplate,
                                    com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        this.alertRepository = alertRepository;
        this.auditLogRepository = auditLogRepository;
        this.thresholdOverrideRepository = thresholdOverrideRepository;
        this.correlationService = correlationService;
        this.slaService = slaService;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    private String getCurrentUser() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private void logAudit(String action, String target, String details, String unit) {
        AuditLogEntity log = AuditLogEntity.builder()
                .actor(getCurrentUser())
                .actorRole("ROLE_OPERATOR")
                .actionType(action)
                .resourceType("ALERT")
                .resourceId(target)
                .details(details)
                .unit(unit)
                .build();
        auditLogRepository.save(log);
    }

    @PostMapping("/alerts/{alertId}/acknowledge")
    public ResponseEntity<?> acknowledgeAlert(@PathVariable UUID alertId, @RequestBody AcknowledgeRequest request) {
        AlertEntity alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        
        if (alert.getResolvedAt() != null) {
            return ResponseEntity.badRequest().body("Cannot acknowledge an already resolved alert.");
        }
        if (alert.getAcknowledgedAt() != null) {
            return ResponseEntity.badRequest().body("Alert is already acknowledged.");
        }
        
        alert.setAcknowledgedBy(getCurrentUser());
        alert.setAcknowledgedAt(Instant.now());
        alert.setAckNotes(request.getNotes());
        alertRepository.save(alert);
        
        logAudit("ACKNOWLEDGE_ALERT", alertId.toString(), "Notes: " + request.getNotes(), alert.getUnit());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/alerts/{alertId}/suppress")
    public ResponseEntity<?> suppressAlert(@PathVariable UUID alertId, @RequestBody SuppressRequest request) {
        AlertEntity alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        
        Instant suppressedUntil = Instant.now().plus(request.getDurationMinutes(), ChronoUnit.MINUTES);
        alert.setSuppressedUntil(suppressedUntil);
        alertRepository.save(alert);
        
        logAudit("SUPPRESS_ALERT", alertId.toString(), "Suppressed until: " + suppressedUntil, alert.getUnit());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/sensors/{sensorId}/override-threshold")
    public ResponseEntity<?> overrideThreshold(@PathVariable String sensorId, @RequestBody ThresholdOverrideRequest request) {
        
        Instant expiresAt = request.getDurationHours() == -1 
            ? Instant.now().plus(9999, ChronoUnit.DAYS)
            : Instant.now().plus(request.getDurationHours(), ChronoUnit.HOURS);
        
        ThresholdOverrideEntity override = ThresholdOverrideEntity.builder()
                .sensorId(sensorId)
                .sensorType(request.getSensorType())
                .newWarning(request.getNewWarn())
                .newCritical(request.getNewCrit())
                .reason(request.getReason())
                .durationHours(request.getDurationHours())
                .initiatedBy(getCurrentUser())
                .expiresAt(expiresAt)
                .build();
                
        thresholdOverrideRepository.save(override);
        
        // Try to determine unit from sensorId if possible (e.g. U1-TEMP-01 -> UNIT_1)
        String unit = sensorId.startsWith("U1") ? "UNIT_1" : (sensorId.startsWith("U2") ? "UNIT_2" : null);
        logAudit("OVERRIDE_THRESHOLD", sensorId, "Warn: " + request.getNewWarn() + " Crit: " + request.getNewCrit() + " Reason: " + request.getReason(), unit);
        
        // Emit Kafka event instead of synchronous REST call
        java.util.Map<String, Object> eventPayload = new java.util.HashMap<>();
        eventPayload.put("sensorId", sensorId);
        eventPayload.put("sensorType", request.getSensorType());
        eventPayload.put("newWarn", request.getNewWarn());
        eventPayload.put("newCrit", request.getNewCrit());
        eventPayload.put("expiresAt", expiresAt.toString());
        eventPayload.put("durationHours", request.getDurationHours());
        eventPayload.put("reason", request.getReason());
        eventPayload.put("initiatedBy", getCurrentUser());
        
        try {
            String jsonPayload = objectMapper.writeValueAsString(eventPayload);
            kafkaTemplate.send("threshold-override-events", sensorId, jsonPayload);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize kafka event", e);
        }
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/alerts/{alertId}/resolve")
    public ResponseEntity<?> resolveAlert(@PathVariable java.util.UUID alertId, @RequestBody com.ntpc.queryapi.dto.ResolveRequest request) {
        AlertEntity alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
                
        if (alert.getResolvedAt() != null) {
            return ResponseEntity.badRequest().body("Alert is already resolved.");
        }
        
        alert.setResolvedBy(getCurrentUser());
        alert.setResolvedAt(Instant.now());
        alert.setResolutionType(request.getResolutionType());
        alert.setResolutionNotes(request.getNotes());
        alertRepository.save(alert);
        
        // Evaluate SLA violations on resolution
        slaService.checkAndRecordViolations(alert);
        
        logAudit("RESOLVE_ALERT", alertId.toString(), "Type: " + request.getResolutionType() + " Notes: " + request.getNotes(), alert.getUnit());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/alerts/sla-metrics")
    public ResponseEntity<java.util.Map<String, Object>> getSlaMetrics(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String unit) {
        
        Instant effectiveTo = (to != null && !to.isEmpty()) ? Instant.parse(to) : Instant.now();
        Instant effectiveFrom = (from != null && !from.isEmpty()) ? Instant.parse(from) : effectiveTo.minus(24, ChronoUnit.HOURS);
        
        // 24-hour stats for SLA Compliance and Breach counts
        com.ntpc.queryapi.repository.AlertRepository.SlaMetricsProjection stats24h = 
            alertRepository.getSlaMetrics(effectiveFrom, effectiveTo, unit);

        // All-time stats for MTTR and Avg Ack Time
        com.ntpc.queryapi.repository.AlertRepository.SlaMetricsProjection allTimeStats = 
            alertRepository.getSlaMetrics(Instant.EPOCH, effectiveTo, unit);

        long totalAlerts = stats24h.getTotalAlerts() != null ? stats24h.getTotalAlerts() : 0;
        long ackBreaches = stats24h.getAckBreachCount() != null ? stats24h.getAckBreachCount() : 0;
        long resBreaches = stats24h.getResolveBreachCount() != null ? stats24h.getResolveBreachCount() : 0;
        
        double compliance = 1.0;
        if (totalAlerts > 0) {
            compliance = 1.0 - ((double)(ackBreaches + resBreaches) / (totalAlerts * 2.0));
            compliance = Math.max(0.0, compliance);
        }
        
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        // Averages from all-time data
        response.put("avgAckSeconds", allTimeStats.getAvgAckSeconds() != null ? allTimeStats.getAvgAckSeconds() : 0.0);
        response.put("avgResolveSeconds", allTimeStats.getAvgResolveSeconds() != null ? allTimeStats.getAvgResolveSeconds() : 0.0);
        response.put("mttrSeconds", allTimeStats.getAvgResolveSeconds() != null ? allTimeStats.getAvgResolveSeconds() : 0.0);
        
        // Counts and compliance from 24h data
        response.put("ackBreachCount", ackBreaches);
        response.put("resolveBreachCount", resBreaches);
        response.put("slaCompliance", compliance);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/alerts/{alertId}/analysis")
    public ResponseEntity<java.util.Map<String, Object>> getRootCauseAnalysis(@PathVariable java.util.UUID alertId) {
        AlertEntity alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
                
        java.util.List<com.ntpc.queryapi.entity.SensorCorrelationEntity> correlations = correlationService.findByTrigger(alert.getSensorId());
        
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("alertId", alertId);
        response.put("trigger", alert);
        
        java.util.Map<String, Object> rca = new java.util.HashMap<>();
        rca.put("likelyRootCauses", correlations);
        response.put("rootCauseAnalysis", rca);
        
        return ResponseEntity.ok(response);
    }
}
