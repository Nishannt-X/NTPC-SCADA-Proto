package com.ntpc.anomaly.service;

import com.ntpc.anomaly.config.ThresholdConfig;
import com.ntpc.anomaly.dto.Alert;
import com.ntpc.anomaly.dto.SensorReading;
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

/**
 * Anomaly detection engine.
 * Evaluates each incoming sensor reading against configurable thresholds.
 * Requires consecutive breaches before firing an alert (noise resistance).
 *
 * This service is completely independent from the Ingestion Service — it reads
 * only from the live Kafka stream, not from the database.
 */
@Slf4j
@Service
public class AnomalyDetectionService {

    private final ThresholdConfig thresholdConfig;
    private final KafkaTemplate<String, Alert> kafkaTemplate;
    private final Counter alertsPublishedCounter;
    private final Counter messagesProcessedCounter;

    // Tracks consecutive breach count per sensorId
    private final Map<String, Integer> breachCounters = new ConcurrentHashMap<>();

    // Cache of active overrides per sensorId
    private final Map<String, com.ntpc.anomaly.dto.ThresholdOverrideRequest> activeOverrides = new ConcurrentHashMap<>();

    @Value("${anomaly.consecutive-breaches-required}")
    private int consecutiveBreachesRequired;

    @Value("${anomaly.alerts-topic}")
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
                .description("Total alerts published to sensor-alerts topic")
                .register(meterRegistry);
        this.messagesProcessedCounter = Counter.builder("anomaly.messages.processed")
                .description("Total sensor readings processed")
                .register(meterRegistry);
    }

    @KafkaListener(topics = "${anomaly.readings-topic}", groupId = "anomaly-detection-group")
    public void evaluate(SensorReading reading) {
        messagesProcessedCounter.increment();
        String sensorId = reading.getSensorId();
        
        double warnThreshold;
        double critThreshold;

        // Check for active override first
        com.ntpc.anomaly.dto.ThresholdOverrideRequest override = activeOverrides.get(sensorId);
        if (override != null) {
            warnThreshold = override.getNewWarn();
            critThreshold = override.getNewCrit();
        } else {
            ThresholdConfig.ThresholdPair thresholds = thresholdConfig.getThresholds().get(reading.getSensorType());
            if (thresholds == null) {
                log.warn("[ANOMALY] No thresholds configured for sensorType={}", reading.getSensorType());
                return;
            }
            warnThreshold = thresholds.getWarning();
            critThreshold = thresholds.getCritical();
        }

        String severity = null;
        double threshold = 0;

        // Check CRITICAL first (higher severity takes precedence)
        if (reading.getValue() > critThreshold) {
            severity = "CRITICAL";
            threshold = critThreshold;
        } else if (reading.getValue() > warnThreshold) {
            severity = "WARNING";
            threshold = warnThreshold;
        }

        if (severity != null) {
            // Threshold breached — increment consecutive counter
            int breachCount = breachCounters.merge(sensorId, 1, Integer::sum);

            log.debug("[ANOMALY] sensorId={} value={} threshold={} severity={} breachCount={}/{}",
                    sensorId, reading.getValue(), threshold, severity,
                    breachCount, consecutiveBreachesRequired);

            if (breachCount >= consecutiveBreachesRequired) {
                // Fire alert
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

                kafkaTemplate.send(alertsTopic, sensorId, alert)
                        .whenComplete((result, ex) -> {
                            if (ex != null) {
                                log.error("[ANOMALY] Failed to publish alert for sensorId={}: {}",
                                        sensorId, ex.getMessage());
                            }
                        });

                alertsPublishedCounter.increment();

                log.warn("[ALERT FIRED] sensorId={} unit={} type={} value={} threshold={} severity={}",
                        sensorId, reading.getUnit(), reading.getSensorType(),
                        reading.getValue(), threshold, severity);

                // Counter is NOT reset here so that alerts are continuously emitted
                // to Kafka every cycle while the breach persists. The AlertingService 
                // will handle frequency deduplication.
            }
        } else {
            // Value within normal range — reset consecutive breach counter
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
