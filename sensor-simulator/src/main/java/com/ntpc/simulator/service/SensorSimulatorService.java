package com.ntpc.simulator.service;

import com.ntpc.simulator.dto.FaultInjectionRequest;
import com.ntpc.simulator.dto.SensorReading;
import com.ntpc.simulator.dto.TelemetryEnvelope;
import com.ntpc.simulator.model.SensorDefinition;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
public class SensorSimulatorService {

    private final List<SensorDefinition> sensorFleet;
    private final KafkaTemplate<String, TelemetryEnvelope> kafkaTemplate;
    
    private final Map<String, Double> globalLoad = new ConcurrentHashMap<>();
    private final Map<String, Double> currentValues = new ConcurrentHashMap<>();
    private final Map<String, FaultState> activeFaults = new ConcurrentHashMap<>();
    private final Counter publishedReadingsCounter;

    public SensorSimulatorService(List<SensorDefinition> sensorFleet,
                                   KafkaTemplate<String, TelemetryEnvelope> kafkaTemplate,
                                   MeterRegistry meterRegistry) {
        this.sensorFleet = sensorFleet;
        this.kafkaTemplate = kafkaTemplate;
        this.publishedReadingsCounter = Counter.builder("simulator.readings.published")
                .register(meterRegistry);
    }

    @PostConstruct
    public void initialize() {
        globalLoad.put("UNIT_1", 100.0);
        globalLoad.put("UNIT_2", 100.0);
        for (SensorDefinition sensor : sensorFleet) {
            currentValues.put(sensor.getSensorId(), sensor.getBaselineValue());
        }
    }

    @Scheduled(fixedDelayString = "${simulator.interval-ms:3000}")
    public void generateAndPublish() {
        Instant now = Instant.now();
        ThreadLocalRandom rand = ThreadLocalRandom.current();

        for (String unit : globalLoad.keySet()) {
            double load = globalLoad.get(unit);
            if (rand.nextDouble() < 0.02) load -= rand.nextDouble(5, 10);
            else if (rand.nextDouble() < 0.02) load += rand.nextDouble(5, 10);
            load = Math.max(60.0, Math.min(100.0, load));
            globalLoad.put(unit, load);
        }

        Map<String, Map<String, List<SensorReading>>> batches = new HashMap<>();

        for (SensorDefinition sensor : sensorFleet) {
            String unit = sensor.getUnit();
            String segment = sensor.getSegment();
            String id = sensor.getSensorId();
            
            double loadRatio = globalLoad.get(unit) / 100.0;
            double baseline = sensor.getBaselineValue();
            double value = currentValues.get(id);

            if (sensor.getSensorType().equals("CURRENT") || sensor.getSensorType().equals("GAS")) {
                value = baseline * loadRatio; 
            } else if (id.contains("PRES")) {
                value = baseline * Math.max(0.8, loadRatio); 
            }
            
            if (activeFaults.containsKey(id)) {
                FaultState fault = activeFaults.get(id);
                value = (value * fault.multiplier) + fault.offset;
                fault.cyclesRemaining--;
                if (fault.cyclesRemaining <= 0) activeFaults.remove(id);
            } else {
                // Mean reversion: Pull back towards baseline by 15% each cycle when healthy
                value += (baseline - value) * 0.15;
            }

            value += baseline * 0.005 * rand.nextDouble(-1, 1);
            
            if (id.contains("BFP_BEARING_VIB") && activeFaults.containsKey(id)) {
                String presId = unit.equals("UNIT_1") ? "U1-MAIN_STEAM_PRES" : "U2-MAIN_STEAM_PRES";
                activeFaults.putIfAbsent(presId, new FaultState(0.90, 5));
            }

            value = Math.max(sensor.getMinBound(), Math.min(sensor.getMaxBound(), value));
            currentValues.put(id, value);

            SensorReading reading = SensorReading.builder()
                    .sensorId(id)
                    .unit(unit)
                    .sensorType(sensor.getSensorType())
                    .value(Math.round(value * 100.0) / 100.0)
                    .unitOfMeasure(sensor.getUnitOfMeasure())
                    .timestamp(now)
                    .build();

            batches.computeIfAbsent(unit, k -> new HashMap<>())
                   .computeIfAbsent(segment, k -> new ArrayList<>())
                   .add(reading);
        }

        for (var unitEntry : batches.entrySet()) {
            for (var segmentEntry : unitEntry.getValue().entrySet()) {
                TelemetryEnvelope envelope = TelemetryEnvelope.builder()
                        .unitId(unitEntry.getKey())
                        .segment(segmentEntry.getKey())
                        .timestamp(now)
                        .version("1.0")
                        .readings(segmentEntry.getValue())
                        .build();

                String topic = "telemetry." + segmentEntry.getKey().toLowerCase();
                kafkaTemplate.send(topic, unitEntry.getKey() + "-" + segmentEntry.getKey(), envelope);
                publishedReadingsCounter.increment();
            }
        }
        log.info("[CYCLE] Published envelopes at {}", now);
    }

    public List<String> injectFault(FaultInjectionRequest request) {
        double multiplier = switch (request.getMagnitude().toUpperCase()) {
            case "SEVERE" -> request.getSensorType().equalsIgnoreCase("VIBRATION") ? 2.5 : 1.25;
            case "MODERATE" -> 1.15;
            default -> 1.10;
        };

        List<String> affectedSensors = new ArrayList<>();
        for (SensorDefinition sensor : sensorFleet) {
            if (sensor.getUnit().equals(request.getUnit()) && sensor.getSensorType().equals(request.getSensorType())) {
                activeFaults.put(sensor.getSensorId(), new FaultState(multiplier, request.getDurationCycles()));
                affectedSensors.add(sensor.getSensorId());
            }
        }
        return affectedSensors;
    }

    public List<String> injectScenario(String scenarioId, String unit, int durationCycles) {
        List<String> affectedSensors = new ArrayList<>();
        String prefix = unit.equals("UNIT_1") ? "U1" : "U2";
        
        switch (scenarioId.toUpperCase()) {
            case "BOILER_TUBE_LEAK":
                activeFaults.put(prefix + "-DRUM_LEVEL", new FaultState(0.2, durationCycles)); // Drops to ~0 mm from 100mm? Baseline is 0mm. Wait, baseline is 0. 0.2*0 = 0.
                // Wait! If baseline is 0, multiplier does nothing. I need an offset.
                // Or I can just set a fixed multiplier on an assumed value?
                // For DRUM_LEVEL, baseline is 0. Let's make the multiplier large so the noise gets amplified, or we can add a new type of fault that applies an offset.
                // Let's modify FaultState to have an offset.
                activeFaults.put(prefix + "-DRUM_LEVEL", new FaultState(1.0, durationCycles, -250.0)); // Drop 250mm
                activeFaults.put(prefix + "-MAIN_STEAM_PRES", new FaultState(0.6, durationCycles, 0.0)); // Drop 40%
                activeFaults.put(prefix + "-FURNACE_DRAFT_PRES", new FaultState(1.0, durationCycles, 30.0)); // Add +30 mmWC
                affectedSensors.addAll(List.of(prefix + "-DRUM_LEVEL", prefix + "-MAIN_STEAM_PRES", prefix + "-FURNACE_DRAFT_PRES"));
                break;
            case "COAL_MILL_TRIP":
                activeFaults.put(prefix + "-MILL_MOTOR_CURRENT", new FaultState(0.01, durationCycles, 0.0));
                activeFaults.put(prefix + "-MILL_OUTLET_TEMP", new FaultState(0.6, durationCycles, 0.0));
                activeFaults.put(prefix + "-FEGT", new FaultState(0.7, durationCycles, 0.0));
                affectedSensors.addAll(List.of(prefix + "-MILL_MOTOR_CURRENT", prefix + "-MILL_OUTLET_TEMP", prefix + "-FEGT"));
                break;
            case "CONDENSER_AIR_INGRESS":
                activeFaults.put(prefix + "-CONDENSER_VACUUM", new FaultState(0.7, durationCycles, 0.0)); // -650 * 0.7 = -455 (critical)
                activeFaults.put(prefix + "-RPM", new FaultState(0.9, durationCycles, 0.0));
                activeFaults.put(prefix + "-STATOR_WINDING_TEMP", new FaultState(1.4, durationCycles, 0.0)); // 105 -> 147
                affectedSensors.addAll(List.of(prefix + "-CONDENSER_VACUUM", prefix + "-RPM", prefix + "-STATOR_WINDING_TEMP"));
                break;
        }
        return affectedSensors;
    }

    private static class FaultState {
        double multiplier;
        int cyclesRemaining;
        double offset;
        FaultState(double m, int c, double o) { multiplier = m; cyclesRemaining = c; offset = o; }
        FaultState(double m, int c) { this(m, c, 0.0); }
    }
}
