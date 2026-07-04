package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.dto.FaultInjectionRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Proxies fault injection requests to the sensor-simulator service,
 * so the frontend only needs to talk to one backend host.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1")
public class SimulatorProxyController {

    private final RestTemplate restTemplate;
    private final String simulatorBaseUrl;

    public SimulatorProxyController(
            RestTemplate restTemplate,
            @Value("${simulator.base-url}") String simulatorBaseUrl) {
        this.restTemplate = restTemplate;
        this.simulatorBaseUrl = simulatorBaseUrl;
    }

    /**
     * POST /api/v1/simulator/inject-fault
     * Proxies the request to the sensor-simulator service.
     */
    @PostMapping("/simulator/inject-fault")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Map<String, Object>> injectFault(@RequestBody FaultInjectionRequest request) {
        String url = simulatorBaseUrl + "/simulator/inject-fault";
        log.info("[PROXY] Forwarding fault injection to simulator: {}", url);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            return ResponseEntity.status(response.getStatusCode())
                    .body(response.getBody());
        } catch (Exception e) {
            log.error("[PROXY ERROR] Failed to reach simulator: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "error",
                    "message", "Failed to reach sensor-simulator: " + e.getMessage()
            ));
        }
    }
}
