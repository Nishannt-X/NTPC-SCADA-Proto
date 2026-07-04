package com.ntpc.anomaly.controller;

import com.ntpc.anomaly.dto.ThresholdOverrideRequest;
import com.ntpc.anomaly.service.AnomalyDetectionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/internal")
public class ThresholdOverrideController {

    private final AnomalyDetectionService anomalyDetectionService;

    public ThresholdOverrideController(AnomalyDetectionService anomalyDetectionService) {
        this.anomalyDetectionService = anomalyDetectionService;
    }

    @PostMapping("/threshold-overrides")
    public ResponseEntity<?> applyOverride(@RequestBody ThresholdOverrideRequest request) {
        log.info("[OVERRIDE] Received threshold override for sensorId={}: warn={}, crit={}", 
            request.getSensorId(), request.getNewWarn(), request.getNewCrit());
        anomalyDetectionService.applyOverride(request);
        return ResponseEntity.ok().build();
    }
}
