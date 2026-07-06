package com.ntpc.queryapi.service;

import com.ntpc.queryapi.dto.AlertResponse;
import com.ntpc.queryapi.entity.AlertEntity;
import com.ntpc.queryapi.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertQueryService {

    private final AlertRepository alertRepository;

    /**
     * Get all currently active (unresolved) alerts.
     */
    public List<AlertResponse> getActiveAlerts() {
        log.info("[QUERY] Fetching active alerts");
        try {
            List<AlertEntity> entities = alertRepository.findActiveAlerts();
            return entities.stream()
                    .filter(a -> a.getSuppressedUntil() == null || a.getSuppressedUntil().isBefore(Instant.now()))
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            // alerts table may not exist yet (Phase 6 migration)
            log.warn("[QUERY] Could not fetch active alerts (table may not exist yet): {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Get historical alerts with optional filters.
     */
    public Page<AlertResponse> getAlertHistory(
            Instant from, Instant to, String unit,
            String severity, int page, int size) {
        log.info("[QUERY] Alert history from={} to={} unit={} severity={}", from, to, unit, severity);
        try {
            Page<AlertEntity> entities = alertRepository.findAlertHistory(
                    from, to, unit, severity, PageRequest.of(page, size));
            return entities.map(this::mapToResponse);
        } catch (Exception e) {
            log.warn("[QUERY] Could not fetch alert history (table may not exist yet): {}", e.getMessage());
            return Page.empty();
        }
    }

    private AlertResponse mapToResponse(AlertEntity entity) {
        return AlertResponse.builder()
                .alertId(entity.getAlertId().toString())
                .sensorId(entity.getSensorId())
                .unit(entity.getUnit())
                .sensorType(entity.getSensorType())
                .value(entity.getValue())
                .threshold(entity.getThreshold())
                .severity(entity.getSeverity())
                .message(entity.getMessage())
                .timestamp(entity.getFiredAt())
                .lastSeenAt(entity.getLastSeenAt())
                .resolvedAt(entity.getResolvedAt())
                .acknowledgedBy(entity.getAcknowledgedBy())
                .suppressedUntil(entity.getSuppressedUntil())
                .build();
    }
}
