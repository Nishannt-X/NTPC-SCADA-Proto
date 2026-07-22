package com.ntpc.anomaly.service;

import com.ntpc.anomaly.config.ThresholdConfig;
import com.ntpc.anomaly.dto.Alert;
import com.ntpc.anomaly.dto.SensorReading;
import com.ntpc.anomaly.dto.TelemetryEnvelope;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class AnomalyDetectionService {

    private final ThresholdConfig thresholdConfig;
    private final KafkaTemplate<String, Alert> kafkaTemplate;
    private final Counter alertsPublishedCounter;
    private final Counter messagesProcessedCounter;

    private final Map<String, Integer> breachCounters = new ConcurrentHashMap<>();
    private final Map<String, com.ntpc.anomaly.dto.ThresholdOverrideRequest> activeOverrides = new ConcurrentHashMap<>();
    private final Map<String, Instant> suppressions = new ConcurrentHashMap<>();

    @Value("${anomaly.consecutive-breaches-required:3}")
    private int consecutiveBreachesRequired;

    @Value("${anomaly.alerts-topic:sensor-alerts}")
    private String alertsTopic;

    public void applyOverride(com.ntpc.anomaly.dto.ThresholdOverrideRequest override) {
        activeOverrides.put(override.getSensorId(), override);
    }

    public AnomalyDetectionService(ThresholdConfig thresholdConfig,
                                    KafkaTemplate<String, Alert> kafkaTemplate,
                                    MeterRegistry meterRegistry) {
        this.thresholdConfig = thresholdConfig;
        this.kafkaTemplate = kafkaTemplate;
        this.alertsPublishedCounter = Counter.builder("anomaly.alerts.published")
                .register(meterRegistry);
        this.messagesProcessedCounter = Counter.builder("anomaly.messages.processed")
                .register(meterRegistry);
    }

    @KafkaListener(topicPattern = "telemetry\\..*", groupId = "anomaly-detection-group")
    public void evaluate(TelemetryEnvelope envelope) {
        if (envelope == null || envelope.getReadings() == null) return;
        
        for (SensorReading reading : envelope.getReadings()) {
            evaluateReading(reading);
        }
    }

    @lombok.Data
    public static class SensorThresholds {
        private double warning;
        private double critical;
        private boolean inverse;
    }

    private final Map<String, SensorThresholds> dynamicThresholds = new ConcurrentHashMap<>();

    @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 10000)
    public void refreshThresholds() {
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            org.springframework.http.ResponseEntity<java.util.List> response = restTemplate.getForEntity("http://query-api:8080/api/v1/sensor-definitions", java.util.List.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                for (Object item : response.getBody()) {
                    Map<String, Object> map = (Map<String, Object>) item;
                    String id = (String) map.get("sensorId");
                    Object warnObj = map.get("warningThreshold");
                    Object critObj = map.get("criticalThreshold");
                    if (id != null && warnObj != null && critObj != null) {
                        double warn = Double.parseDouble(warnObj.toString());
                        double crit = Double.parseDouble(critObj.toString());
                        SensorThresholds st = new SensorThresholds();
                        st.setWarning(warn);
                        st.setCritical(crit);
                        st.setInverse(crit < warn);
                        dynamicThresholds.put(id, st);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not fetch thresholds from query-api: {}", e.getMessage());
        }
    }

    private void evaluateReading(SensorReading reading) {
        messagesProcessedCounter.increment();
        String sensorId = reading.getSensorId();
        
        double warnThreshold;
        double critThreshold;
        boolean inverse = false;

        com.ntpc.anomaly.dto.ThresholdOverrideRequest override = activeOverrides.get(sensorId);
        if (override != null) {
            warnThreshold = override.getNewWarn();
            critThreshold = override.getNewCrit();
            inverse = critThreshold < warnThreshold;
        } else {
            SensorThresholds dyn = dynamicThresholds.get(sensorId);
            if (dyn != null) {
                warnThreshold = dyn.getWarning();
                critThreshold = dyn.getCritical();
                inverse = dyn.isInverse();
            } else {
                if (dynamicThresholds.isEmpty()) {
                    return; // Wait for thresholds to load on startup
                }
                ThresholdConfig.ThresholdPair thresholds = thresholdConfig.getThresholds().get(reading.getSensorType());
                if (thresholds == null) return; // Ignore unconfigured types
                warnThreshold = thresholds.getWarning();
                critThreshold = thresholds.getCritical();
                inverse = false;
            }
        }

        String severity = null;
        double threshold = 0;

        if (inverse) {
            if (reading.getValue() <= critThreshold) {
                severity = "CRITICAL";
                threshold = critThreshold;
            } else if (reading.getValue() <= warnThreshold) {
                severity = "WARNING";
                threshold = warnThreshold;
            }
        } else {
            if (reading.getValue() >= critThreshold) {
                severity = "CRITICAL";
                threshold = critThreshold;
            } else if (reading.getValue() >= warnThreshold) {
                severity = "WARNING";
                threshold = warnThreshold;
            }
        }

        if (severity != null) {
            int breachCount = breachCounters.merge(sensorId, 1, Integer::sum);
            
            // ISA-18.2 Cascade Suppression Engine
            if (severity.equals("CRITICAL")) {
                if (sensorId.contains("BFP_BEARING_VIB")) {
                    // Suppress steam pressure and drum level for 5 minutes
                    String unit = reading.getUnit();
                    suppressions.put(unit.equals("UNIT_1") ? "U1-MAIN_STEAM_PRES" : "U2-MAIN_STEAM_PRES", Instant.now().plusSeconds(300));
                    suppressions.put(unit.equals("UNIT_1") ? "U1-DRUM_LEVEL" : "U2-DRUM_LEVEL", Instant.now().plusSeconds(300));
                } else if (sensorId.contains("MILL_MOTOR_CURRENT")) {
                    // Suppress FEGT and Main Steam Temp
                    String unit = reading.getUnit();
                    suppressions.put(unit.equals("UNIT_1") ? "U1-FEGT" : "U2-FEGT", Instant.now().plusSeconds(300));
                    suppressions.put(unit.equals("UNIT_1") ? "U1-MAIN_STEAM_TEMP" : "U2-MAIN_STEAM_TEMP", Instant.now().plusSeconds(300));
                }
            }

            if (breachCount >= consecutiveBreachesRequired) {
                // Check if suppressed
                Instant suppressionExpiry = suppressions.get(sensorId);
                if (suppressionExpiry != null && Instant.now().isBefore(suppressionExpiry)) {
                    log.debug("[SUPPRESSED] Cascade logic marked alert as CONSEQUENTIAL for {}", sensorId);
                    severity = "CONSEQUENTIAL";
                }

                Alert alert = Alert.builder()
                        .alertId(UUID.randomUUID().toString())
                        .sensorId(sensorId)
                        .unit(reading.getUnit())
                        .sensorType(reading.getSensorType())
                        .value(reading.getValue())
                        .threshold(threshold)
                        .severity(severity)
                        .timestamp(Instant.now())
                        .message(buildAlertMessage(reading, severity, threshold))
                        .build();

                kafkaTemplate.send(alertsTopic, sensorId, alert);
                alertsPublishedCounter.increment();
            }
        } else {
            if (breachCounters.containsKey(sensorId)) {
                breachCounters.put(sensorId, 0);
            }
        }
    }

    private String buildAlertMessage(SensorReading reading, String severity, double threshold) {
        String unitLabel = reading.getUnit().replace("_", " ");
        String typeLabel = reading.getSensorType().toLowerCase();
        return String.format("%s %s %s exceeded %s threshold: %.2f %s (threshold: %.2f %s)",
                unitLabel, typeLabel, reading.getSensorId(),
                severity.toLowerCase(),
                reading.getValue(), reading.getUnitOfMeasure(),
                threshold, reading.getUnitOfMeasure());
    }
}
