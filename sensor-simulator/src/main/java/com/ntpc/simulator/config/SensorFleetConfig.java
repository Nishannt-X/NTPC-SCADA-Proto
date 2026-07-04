package com.ntpc.simulator.config;

import com.ntpc.simulator.model.SensorDefinition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/**
 * Defines the virtual sensor fleet — 15 sensors per unit (30 total).
 * Covers all five sensor types with realistic baseline values.
 */
@Configuration
public class SensorFleetConfig {

    @Bean
    public List<SensorDefinition> sensorFleet() {
        List<SensorDefinition> fleet = new ArrayList<>();

        // Generate sensors for both units
        for (String unit : List.of("UNIT_1", "UNIT_2")) {
            String prefix = unit.equals("UNIT_1") ? "U1" : "U2";

            // --- TEMPERATURE sensors (boiler/turbine) ---
            // Baseline ~540°C, range 400-650°C
            for (int i = 1; i <= 3; i++) {
                fleet.add(SensorDefinition.builder()
                        .sensorId(prefix + "-TEMP-" + String.format("%02d", i))
                        .unit(unit)
                        .sensorType("TEMPERATURE")
                        .baselineValue(540.0)
                        .unitOfMeasure("°C")
                        .minBound(400.0)
                        .maxBound(650.0)
                        .build());
            }

            // --- PRESSURE sensors ---
            // Baseline ~170 bar, range 120-220 bar
            for (int i = 1; i <= 3; i++) {
                fleet.add(SensorDefinition.builder()
                        .sensorId(prefix + "-PRES-" + String.format("%02d", i))
                        .unit(unit)
                        .sensorType("PRESSURE")
                        .baselineValue(170.0)
                        .unitOfMeasure("bar")
                        .minBound(120.0)
                        .maxBound(220.0)
                        .build());
            }

            // --- VIBRATION sensors ---
            // Baseline ~0.3mm, range 0.05-1.0mm
            for (int i = 1; i <= 3; i++) {
                fleet.add(SensorDefinition.builder()
                        .sensorId(prefix + "-VIB-" + String.format("%02d", i))
                        .unit(unit)
                        .sensorType("VIBRATION")
                        .baselineValue(0.3)
                        .unitOfMeasure("mm")
                        .minBound(0.05)
                        .maxBound(1.0)
                        .build());
            }

            // --- RPM sensors (turbine speed) ---
            // Baseline ~3000rpm, range 2800-3400rpm
            for (int i = 1; i <= 3; i++) {
                fleet.add(SensorDefinition.builder()
                        .sensorId(prefix + "-RPM-" + String.format("%02d", i))
                        .unit(unit)
                        .sensorType("RPM")
                        .baselineValue(3000.0)
                        .unitOfMeasure("rpm")
                        .minBound(2800.0)
                        .maxBound(3400.0)
                        .build());
            }

            // --- LOAD sensors ---
            // Baseline ~75%, range 30-100%
            for (int i = 1; i <= 3; i++) {
                fleet.add(SensorDefinition.builder()
                        .sensorId(prefix + "-LOAD-" + String.format("%02d", i))
                        .unit(unit)
                        .sensorType("LOAD")
                        .baselineValue(75.0)
                        .unitOfMeasure("%")
                        .minBound(30.0)
                        .maxBound(100.0)
                        .build());
            }
        }

        return fleet;
    }
}
