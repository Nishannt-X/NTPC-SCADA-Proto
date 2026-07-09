package com.ntpc.simulator.config;

import com.ntpc.simulator.model.SensorDefinition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/**
 * Defines the realistic virtual sensor fleet — 30 sensors per unit across 6 segments.
 */
@Configuration
public class SensorFleetConfig {

    @Bean
    public List<SensorDefinition> sensorFleet() {
        List<SensorDefinition> fleet = new ArrayList<>();

        for (String unit : List.of("UNIT_1", "UNIT_2")) {
            String prefix = unit.equals("UNIT_1") ? "U1" : "U2";

            // 1. Fuel Handling & Preparation (5)
            addSensor(fleet, unit, prefix + "-MILL_OUTLET_TEMP", "TEMPERATURE", 85.0, "°C", 0.0, 150.0, 95.0, 110.0, "FUEL");
            addSensor(fleet, unit, prefix + "-MILL_BEARING_VIB", "VIBRATION", 3.0, "mm/s", 0.0, 15.0, 5.0, 7.5, "FUEL");
            addSensor(fleet, unit, prefix + "-MILL_MOTOR_CURRENT", "CURRENT", 120.0, "A", 0.0, 200.0, 150.0, 175.0, "FUEL");
            addSensor(fleet, unit, prefix + "-BUNKER_COAL_TEMP", "TEMPERATURE", 45.0, "°C", 0.0, 100.0, 60.0, 75.0, "FUEL");
            addSensor(fleet, unit, prefix + "-BELT_MISALIGNMENT", "DIGITAL", 0.0, "", 0.0, 1.0, 1.0, 1.0, "FUEL");

            // 2. Boiler Island (7)
            addSensor(fleet, unit, prefix + "-FURNACE_DRAFT_PRES", "PRESSURE", -10.0, "mmWC", -50.0, 50.0, 5.0, 15.0, "BOILER");
            addSensor(fleet, unit, prefix + "-DRUM_LEVEL", "LEVEL", 0.0, "mm", -300.0, 300.0, 100.0, 150.0, "BOILER");
            addSensor(fleet, unit, prefix + "-MAIN_STEAM_TEMP", "TEMPERATURE", 568.0, "°C", 400.0, 650.0, 580.0, 595.0, "BOILER");
            addSensor(fleet, unit, prefix + "-MAIN_STEAM_PRES", "PRESSURE", 160.0, "kg/cm2", 100.0, 250.0, 175.0, 185.0, "BOILER");
            addSensor(fleet, unit, prefix + "-FEGT", "TEMPERATURE", 1050.0, "°C", 800.0, 1200.0, 1100.0, 1150.0, "BOILER");
            addSensor(fleet, unit, prefix + "-FLAME_SCANNER", "DIGITAL", 1.0, "", 0.0, 1.0, 0.0, 0.0, "BOILER"); // Inverse
            addSensor(fleet, unit, prefix + "-WATERWALL_TEMP", "TEMPERATURE", 320.0, "°C", 200.0, 450.0, 360.0, 380.0, "BOILER");

            // 3. Turbine-Generator (5)
            addSensor(fleet, unit, prefix + "-SHAFT_VIB", "VIBRATION", 80.0, "um", 0.0, 200.0, 120.0, 150.0, "TURBINE");
            addSensor(fleet, unit, prefix + "-BEARING_METAL_TEMP", "TEMPERATURE", 75.0, "°C", 20.0, 150.0, 95.0, 110.0, "TURBINE");
            addSensor(fleet, unit, prefix + "-LUBE_OIL_PRES", "PRESSURE", 1.2, "bar", 0.0, 5.0, 0.8, 0.5, "TURBINE"); // Inverse
            addSensor(fleet, unit, prefix + "-STATOR_WINDING_TEMP", "TEMPERATURE", 105.0, "°C", 20.0, 200.0, 125.0, 140.0, "TURBINE");
            addSensor(fleet, unit, prefix + "-RPM", "RPM", 3000.0, "rpm", 0.0, 3500.0, 3100.0, 3250.0, "TURBINE");

            // 4. Water Cycle / Heat Rejection (5)
            addSensor(fleet, unit, prefix + "-CONDENSER_VACUUM", "PRESSURE", -650.0, "mmHg", -800.0, 0.0, -600.0, -550.0, "WATER"); // Rising towards 0 is bad
            addSensor(fleet, unit, prefix + "-CONDENSER_COND", "CONDUCTIVITY", 0.1, "uS/cm", 0.0, 10.0, 0.5, 1.0, "WATER");
            addSensor(fleet, unit, prefix + "-HOTWELL_LEVEL", "LEVEL", 50.0, "%", 0.0, 100.0, 75.0, 85.0, "WATER");
            addSensor(fleet, unit, prefix + "-BFP_BEARING_VIB", "VIBRATION", 3.0, "mm/s", 0.0, 15.0, 6.0, 8.0, "WATER");
            addSensor(fleet, unit, prefix + "-DEAERATOR_LEVEL", "LEVEL", 0.0, "mm", -200.0, 200.0, 100.0, 150.0, "WATER");

            // 5. Electrical / Switchyard (5)
            addSensor(fleet, unit, prefix + "-GEN_DIFF_PROT", "DIGITAL", 0.0, "", 0.0, 1.0, 1.0, 1.0, "ELECTRICAL");
            addSensor(fleet, unit, prefix + "-TRANSFORMER_DGA", "GAS", 5.0, "ppm", 0.0, 500.0, 100.0, 250.0, "ELECTRICAL");
            addSensor(fleet, unit, prefix + "-TRANSFORMER_TEMP", "TEMPERATURE", 70.0, "°C", 20.0, 150.0, 95.0, 110.0, "ELECTRICAL");
            addSensor(fleet, unit, prefix + "-BUCHHOLZ_RELAY", "DIGITAL", 0.0, "", 0.0, 1.0, 1.0, 1.0, "ELECTRICAL");
            addSensor(fleet, unit, prefix + "-BREAKER_STATUS", "DIGITAL", 1.0, "", 0.0, 1.0, 0.0, 0.0, "ELECTRICAL"); // Inverse

            // 6. Emissions Control (5)
            addSensor(fleet, unit, prefix + "-STACK_SO2", "GAS", 250.0, "mg/Nm3", 0.0, 1000.0, 500.0, 800.0, "EMISSIONS");
            addSensor(fleet, unit, prefix + "-STACK_OPACITY", "OPTICAL", 4.0, "%", 0.0, 100.0, 15.0, 25.0, "EMISSIONS");
            addSensor(fleet, unit, prefix + "-ESP_FIELD_CURRENT", "CURRENT", 500.0, "mA", 0.0, 1000.0, 200.0, 100.0, "EMISSIONS"); // Inverse
            addSensor(fleet, unit, prefix + "-ID_FAN_VIB", "VIBRATION", 3.5, "mm/s", 0.0, 15.0, 7.0, 10.0, "EMISSIONS");
            addSensor(fleet, unit, prefix + "-FGD_SLURRY_PH", "PH", 5.5, "pH", 0.0, 14.0, 4.5, 3.5, "EMISSIONS"); // Inverse
        }

        return fleet;
    }

    private void addSensor(List<SensorDefinition> fleet, String unit, String id, String type, double base, String uom, double min, double max, double warn, double crit, String segment) {
        fleet.add(SensorDefinition.builder()
                .sensorId(id)
                .unit(unit)
                .sensorType(type)
                .baselineValue(base)
                .unitOfMeasure(uom)
                .minBound(min)
                .maxBound(max)
                .warnThreshold(warn)
                .critThreshold(crit)
                .segment(segment)
                .build());
    }
}
