package com.ntpc.simulator.controller;

import com.ntpc.simulator.dto.FaultInjectionRequest;
import com.ntpc.simulator.service.SensorSimulatorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin/demo controller for the sensor simulator.
 * Exposes fault injection endpoint for triggering anomalies on demand.
 */
@Slf4j
@RestController
@RequestMapping("/simulator")
@RequiredArgsConstructor
public class SimulatorController {

    private final SensorSimulatorService simulatorService;

    /**
     * Inject a fault into sensors matching the given unit and sensor type.
     *
     * Example request:
     * POST /simulator/inject-fault
     * {
     *   "unit": "UNIT_1",
     *   "sensorType": "TEMPERATURE",
     *   "magnitude": "SEVERE",
     *   "durationCycles": 10
     * }
     */
    @PostMapping("/inject-fault")
    public ResponseEntity<Map<String, Object>> injectFault(@RequestBody FaultInjectionRequest request) {
        log.info("[FAULT REQUEST] unit={} sensorType={} magnitude={} durationCycles={}",
                request.getUnit(), request.getSensorType(),
                request.getMagnitude(), request.getDurationCycles());

        List<String> affectedSensors = simulatorService.injectFault(request);

        if (affectedSensors.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "No sensors found matching unit=" + request.getUnit()
                            + " and sensorType=" + request.getSensorType()
            ));
        }

        return ResponseEntity.ok(Map.of(
                "status", "fault_injected",
                "affectedSensors", affectedSensors,
                "magnitude", request.getMagnitude(),
                "durationCycles", request.getDurationCycles()
        ));
    }
    @PostMapping("/inject-scenario")
    public ResponseEntity<Map<String, Object>> injectScenario(@RequestBody Map<String, Object> request) {
        String scenarioId = (String) request.get("scenarioId");
        String unit = (String) request.get("unit");
        int durationCycles = (Integer) request.get("durationCycles");
        
        log.info("[SCENARIO REQUEST] scenarioId={} unit={} durationCycles={}", scenarioId, unit, durationCycles);
        
        List<String> affectedSensors = simulatorService.injectScenario(scenarioId, unit, durationCycles);
        
        if (affectedSensors.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Unknown scenario or unit"
            ));
        }

        return ResponseEntity.ok(Map.of(
                "status", "scenario_injected",
                "affectedSensors", affectedSensors,
                "scenarioId", scenarioId
        ));
    }
    /**
     * Health/status check for the simulator.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        return ResponseEntity.ok(Map.of(
                "service", "sensor-simulator",
                "status", "running"
        ));
    }
}
