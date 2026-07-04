package com.ntpc.simulator.service;

import com.ntpc.simulator.dto.FaultInjectionRequest;
import com.ntpc.simulator.dto.SensorReading;
import com.ntpc.simulator.model.SensorDefinition;
import com.ntpc.simulator.model.SensorState;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Core simulation engine. Generates realistic sensor readings via random walk
 * and publishes them to Kafka on a scheduled interval.
 */
@Slf4j
@Service
public class SensorSimulatorService {

    private final List<SensorDefinition> sensorFleet;
    private final KafkaTemplate<String, SensorReading> kafkaTemplate;
    private final Map<String, SensorState> sensorStates = new ConcurrentHashMap<>();
    private final Counter publishedReadingsCounter;

    @Value("${simulator.topic}")
    private String topic;

    @Value("${simulator.drift-percent}")
    private double driftPercent;

    public SensorSimulatorService(List<SensorDefinition> sensorFleet,
                                   KafkaTemplate<String, SensorReading> kafkaTemplate,
                                   MeterRegistry meterRegistry) {
        this.sensorFleet = sensorFleet;
        this.kafkaTemplate = kafkaTemplate;
        this.publishedReadingsCounter = Counter.builder("simulator.readings.published")
                .description("Total sensor readings published to Kafka")
                .register(meterRegistry);
    }

    @PostConstruct
    public void initialize() {
        // Initialize state for each sensor at its baseline value
        for (SensorDefinition sensor : sensorFleet) {
            sensorStates.put(sensor.getSensorId(), new SensorState(sensor.getBaselineValue()));
        }
        log.info("Initialized {} virtual sensors across 2 units", sensorFleet.size());
    }

    /**
     * Main simulation loop — runs on a fixed-delay schedule.
     * Generates one reading per sensor per cycle and publishes to Kafka.
     */
    @Scheduled(fixedDelayString = "${simulator.interval-ms}")
    public void generateAndPublish() {
        Instant now = Instant.now();

        for (SensorDefinition sensor : sensorFleet) {
            SensorState state = sensorStates.get(sensor.getSensorId());
            double newValue = computeNextValue(sensor, state);

            SensorReading reading = SensorReading.builder()
                    .sensorId(sensor.getSensorId())
                    .unit(sensor.getUnit())
                    .sensorType(sensor.getSensorType())
                    .value(Math.round(newValue * 100.0) / 100.0)  // 2 decimal places
                    .unitOfMeasure(sensor.getUnitOfMeasure())
                    .timestamp(now)
                    .build();

            kafkaTemplate.send(topic, sensor.getSensorId(), reading)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("[PUBLISH FAILED] sensorId={} error={}", sensor.getSensorId(), ex.getMessage());
                        }
                    });

            publishedReadingsCounter.increment();

            log.debug("[PUBLISH] sensorId={} unit={} type={} value={} {}",
                    sensor.getSensorId(), sensor.getUnit(), sensor.getSensorType(),
                    reading.getValue(), sensor.getUnitOfMeasure());
        }

        log.info("[CYCLE] Published readings for {} sensors at {}", sensorFleet.size(), now);
    }

    /**
     * Compute the next sensor value using random walk with optional fault injection.
     *
     * Normal mode: small random walk (±drift% of baseline) around current value.
     * Fault mode: value pushed toward (baseline × faultMultiplier) with some noise.
     */
    private double computeNextValue(SensorDefinition sensor, SensorState state) {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        double baseline = sensor.getBaselineValue();
        double driftRange = baseline * (driftPercent / 100.0);

        double newValue;

        if (state.isFaultActive()) {
            // Fault mode: push value toward fault target with noise
            double faultTarget = baseline * state.getFaultMultiplier();
            double currentDistance = faultTarget - state.getCurrentValue();
            // Move 30-50% of the remaining distance + some noise
            newValue = state.getCurrentValue() + (currentDistance * random.nextDouble(0.3, 0.5))
                    + random.nextDouble(-driftRange * 0.3, driftRange * 0.3);
            state.decrementFaultCycle();

            if (!state.isFaultActive()) {
                log.info("[FAULT END] sensorId={} returning to normal drift", sensor.getSensorId());
            }
        } else {
            // Normal mode: random walk with mean-reversion toward baseline
            double meanReversionStrength = 0.02;  // 2% pull toward baseline
            double meanReversion = (baseline - state.getCurrentValue()) * meanReversionStrength;
            double drift = random.nextDouble(-driftRange, driftRange);
            newValue = state.getCurrentValue() + drift + meanReversion;
        }

        // Clamp to physical bounds
        newValue = Math.max(sensor.getMinBound(), Math.min(sensor.getMaxBound(), newValue));
        state.setCurrentValue(newValue);

        return newValue;
    }

    /**
     * Inject a fault into sensors matching the specified unit and sensor type.
     * Returns the list of affected sensor IDs.
     */
    public List<String> injectFault(FaultInjectionRequest request) {
        double multiplier = switch (request.getMagnitude().toUpperCase()) {
            case "SEVERE" -> request.getSensorType().equalsIgnoreCase("VIBRATION") ? 2.5 : 1.25;
            case "MODERATE" -> 1.15; // +15% above baseline
            default -> 1.10;         // fallback: +10%
        };

        List<String> affectedSensors = new ArrayList<>();

        for (SensorDefinition sensor : sensorFleet) {
            if (sensor.getUnit().equals(request.getUnit())
                    && sensor.getSensorType().equals(request.getSensorType())) {
                SensorState state = sensorStates.get(sensor.getSensorId());
                state.setFaultCyclesRemaining(request.getDurationCycles());
                state.setFaultMultiplier(multiplier);
                affectedSensors.add(sensor.getSensorId());

                log.warn("[FAULT INJECT] sensorId={} magnitude={} multiplier={} durationCycles={}",
                        sensor.getSensorId(), request.getMagnitude(), multiplier, request.getDurationCycles());
            }
        }

        return affectedSensors;
    }
}
