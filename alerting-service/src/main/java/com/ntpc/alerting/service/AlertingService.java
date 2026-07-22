package com.ntpc.alerting.service;

import com.ntpc.alerting.dto.Alert;
import com.ntpc.alerting.entity.AlertEntity;
import com.ntpc.alerting.repository.AlertRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Alerting service that:
 * 1. Consumes alerts from sensor-alerts topic
 * 2. Deduplicates: same sensorId+severity within N minutes → update lastSeenAt only
 * 3. Persists new alerts to the database
 * 4. Stubs notification logging
 * 5. Auto-resolves stale alerts on a scheduled task
 */
@Slf4j
@Service
public class AlertingService {

    private final AlertRepository alertRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final Counter alertsPersistedCounter;
    private final Counter alertsDeduplicatedCounter;
    private final Counter alertsResolvedCounter;

    @Value("${alerting.lifecycle-events-topic:alert-lifecycle-events}")
    private String lifecycleTopic;

    @Value("${alerting.dedup-window-minutes}")
    private int dedupWindowMinutes;

    @Value("${alerting.auto-resolve-window-minutes}")
    private int autoResolveWindowMinutes;

    public AlertingService(AlertRepository alertRepository, MeterRegistry meterRegistry, KafkaTemplate<String, Object> kafkaTemplate) {
        this.alertRepository = alertRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.alertsPersistedCounter = Counter.builder("alerting.alerts.persisted")
                .description("Total new alerts persisted")
                .register(meterRegistry);
        this.alertsDeduplicatedCounter = Counter.builder("alerting.alerts.deduplicated")
                .description("Total alerts suppressed via deduplication")
                .register(meterRegistry);
        this.alertsResolvedCounter = Counter.builder("alerting.alerts.resolved")
                .description("Total alerts auto-resolved")
                .register(meterRegistry);
    }

    @KafkaListener(topics = "${alerting.topic}", groupId = "alerting-group")
    @Transactional
    public void processAlert(Alert alert) {
        String sensorId = alert.getSensorId();
        String severity = alert.getSeverity();

        // --- Deduplication check ---
        Optional<AlertEntity> existingOpt = alertRepository
                .findActiveAlertBySensorAndSeverity(sensorId, severity);

        if (existingOpt.isPresent()) {
            AlertEntity existing = existingOpt.get();
            
            // --- Suppression check ---
            if (existing.getSuppressedUntil() != null && existing.getSuppressedUntil().isAfter(Instant.now())) {
                log.info("[SUPPRESSED] Ignoring alert for sensorId={} (suppressed until {})", sensorId, existing.getSuppressedUntil());
                return;
            }

            // Unconditionally deduplicate if the alert is still active
            existing.setLastSeenAt(Instant.now());
            existing.setValue(alert.getValue());
            alertRepository.save(existing);
            alertsDeduplicatedCounter.increment();

            log.debug("[DEDUP] Suppressed duplicate alert for sensorId={} severity={} (existing alertId={})",
                    sensorId, severity, existing.getAlertId());
            return;
        }

        // --- Calculate SLA targets (Mock logic or direct logic) ---
        Instant ackDeadline = Instant.now().plus(15, ChronoUnit.MINUTES);
        Instant resDeadline = Instant.now().plus(60, ChronoUnit.MINUTES);

        // --- Escalate on shared systems ---
        boolean escalated = false;
        String escalationReason = null;
        if (severity.equalsIgnoreCase("CRITICAL") && alert.getUnit().equalsIgnoreCase("SHARED")) {
            escalated = true;
            escalationReason = "CRITICAL on shared system impacts multiple units";
        }

        // --- Persist new alert ---
        AlertEntity entity = AlertEntity.builder()
                .alertId(UUID.fromString(alert.getAlertId()))
                .sensorId(sensorId)
                .unit(alert.getUnit())
                .sensorType(alert.getSensorType())
                .value(alert.getValue())
                .threshold(alert.getThreshold())
                .severity(severity)
                .message(alert.getMessage())
                .firedAt(alert.getTimestamp())
                .lastSeenAt(Instant.now())
                .resolvedAt(null)
                .ackDeadline(ackDeadline)
                .resolutionDeadline(resDeadline)
                .escalated(escalated)
                .escalationReason(escalationReason)
                .build();

        alertRepository.save(entity);
        alertsPersistedCounter.increment();

        // Emit lifecycle event
        com.ntpc.alerting.dto.AlertLifecycleEvent event = com.ntpc.alerting.dto.AlertLifecycleEvent.builder()
                .alertId(entity.getAlertId())
                .sensorId(sensorId)
                .eventType("ALERT_CREATED")
                .severity(severity)
                .details(alert.getMessage())
                .timestamp(Instant.now())
                .build();
        kafkaTemplate.send(lifecycleTopic, sensorId, event);

        // --- Stubbed notification ---
        log.warn("[NOTIFY] {} alert for {}: {}",
                severity, sensorId, alert.getMessage());

        log.info("[ALERT PERSISTED] alertId={} sensorId={} severity={} value={} threshold={}",
                alert.getAlertId(), sensorId, severity, alert.getValue(), alert.getThreshold());
    }

    /**
     * Auto-resolution: resolve alerts whose last_seen_at is older than the configured window.
     * This means the threshold is no longer being breached.
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedDelayString = "${alerting.auto-resolve-check-interval-ms}")
    @Transactional
    public void autoResolveStaleAlerts() {
        Instant cutoff = Instant.now().minus(autoResolveWindowMinutes, ChronoUnit.MINUTES);
        Instant now = Instant.now();

        List<AlertEntity> staleAlerts = alertRepository.findStaleUnresolvedAlerts(cutoff);
        if (staleAlerts.isEmpty()) {
            return;
        }

        int resolved = alertRepository.resolveStaleAlerts(cutoff, now);

        if (resolved > 0) {
            alertsResolvedCounter.increment(resolved);
            log.info("[RESOLVE] Auto-resolved {} stale alerts (last seen before {})", resolved, cutoff);
            
            for (AlertEntity stale : staleAlerts) {
                com.ntpc.alerting.dto.AlertLifecycleEvent event = com.ntpc.alerting.dto.AlertLifecycleEvent.builder()
                        .alertId(stale.getAlertId())
                        .sensorId(stale.getSensorId())
                        .eventType("ALERT_RESOLVED")
                        .severity(stale.getSeverity())
                        .details("Auto-resolved due to inactivity")
                        .timestamp(now)
                        .build();
                kafkaTemplate.send(lifecycleTopic, stale.getSensorId(), event);
            }
        }
    }
}
