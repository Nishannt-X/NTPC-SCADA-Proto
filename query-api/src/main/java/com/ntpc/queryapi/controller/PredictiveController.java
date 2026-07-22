package com.ntpc.queryapi.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Proxies predictive maintenance requests to the Python ML inference service.
 * Same pattern as SimulatorProxyController.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/predictive")
public class PredictiveController {

    private final RestTemplate restTemplate;
    private final String mlBaseUrl;

    public PredictiveController(
            RestTemplate restTemplate,
            @Value("${ml.inference.base-url:http://localhost:8090}") String mlBaseUrl) {
        this.restTemplate = restTemplate;
        this.mlBaseUrl = mlBaseUrl;
    }

    /** GET /api/v1/predictive/health — ML model status */
    @GetMapping("/health")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> health() {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(mlBaseUrl + "/health", Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            log.warn("[ML PROXY] ML service unreachable: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("status", "offline", "message", e.getMessage()));
        }
    }

    /** GET /api/v1/predictive/scores/{unit} — anomaly scores for a unit */
    @GetMapping("/scores/{unit}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> scores(@PathVariable String unit) {
        String backendUnit = unit.equals("unit-1") ? "UNIT_1" : "UNIT_2";
        String url = mlBaseUrl + "/predict/" + backendUnit;
        log.info("[ML PROXY] Fetching scores from: {}", url);

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            log.warn("[ML PROXY] ML service error: {}", e.getMessage());
            return ResponseEntity.ok(Map.of(
                    "anomaly_score", 0.0,
                    "threshold", 0.0,
                    "is_anomaly", false,
                    "stage_scores", Map.of(),
                    "top_sensors", java.util.List.of(),
                    "status", "offline"
            ));
        }
    }
}
