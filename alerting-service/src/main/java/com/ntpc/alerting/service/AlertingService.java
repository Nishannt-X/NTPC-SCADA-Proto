package com.ntpc.alerting.service;

import com.ntpc.alerting.dto.Alert;
import com.ntpc.alerting.entity.AlertEntity;
import com.ntpc.alerting.repository.AlertRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
    private final Counter alertsPersistedCounter;
    private final Counter alertsDeduplicatedCounter;
    private final Counter alertsResolvedCounter;

    @Value("${alerting.dedup-window-minutes}")
    private int dedupWindowMinutes;

    @Value("${alerting.auto-resolve-window-minutes}")
    private int autoResolveWindowMinutes;

    public AlertingService(AlertRepository alertRepository, MeterRegistry meterRegistry) {
        this.alertRepository = alertRepository;
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
            Instant dedupCutoff = Instant.now().minus(dedupWindowMinutes, ChronoUnit.MINUTES);

            if (existing.getTriggeredAt().isAfter(dedupCutoff)) {
                // Within dedup window — just update lastSeenAt and value
                existing.setLastSeenAt(Instant.now());
                existing.setValue(alert.getValue());
                alertRepository.save(existing);
                alertsDeduplicatedCounter.increment();

                log.info("[DEDUP] Suppressed duplicate alert for sensorId={} severity={} (existing alertId={})",
                        sensorId, severity, existing.getAlertId());
                return;
            }
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
                .triggeredAt(alert.getTimestamp())
                .lastSeenAt(Instant.now())
                .resolvedAt(null)
                .build();

        alertRepository.save(entity);
        alertsPersistedCounter.increment();

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
    @Scheduled(fixedDelayString = "${alerting.auto-resolve-check-interval-ms}")
    @Transactional
    public void autoResolveStaleAlerts() {
        Instant cutoff = Instant.now().minus(autoResolveWindowMinutes, ChronoUnit.MINUTES);
        Instant now = Instant.now();

        int resolved = alertRepository.resolveStaleAlerts(cutoff, now);

        if (resolved > 0) {
            alertsResolvedCounter.increment(resolved);
            log.info("[RESOLVE] Auto-resolved {} stale alerts (last seen before {})", resolved, cutoff);
        }
    }
}
