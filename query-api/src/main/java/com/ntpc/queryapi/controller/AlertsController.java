package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.dto.AlertResponse;
import com.ntpc.queryapi.service.AlertQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.temporal.ChronoUnit;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AlertsController {

    private final AlertQueryService alertQueryService;

    /**
     * GET /api/v1/alerts/active
     * Returns all currently active (unresolved) alerts.
     */
    @GetMapping("/alerts/active")
    public ResponseEntity<List<AlertResponse>> getActiveAlerts() {
        List<AlertResponse> alerts = alertQueryService.getActiveAlerts();
        return ResponseEntity.ok(alerts);
    }

    /**
     * GET /api/v1/alerts/history?from=&to=&unit=&severity=&page=&size=
     * Historical alerts with optional filters.
     */
    @GetMapping("/alerts/history")
    public ResponseEntity<Page<AlertResponse>> getAlertHistory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String unit,
            @RequestParam(required = false) String severity,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        // Default to last 24 hours if not specified
        Instant effectiveTo = (to != null) ? to : Instant.now();
        Instant effectiveFrom = (from != null) ? from : effectiveTo.minus(24, ChronoUnit.HOURS);
        Page<AlertResponse> alerts = alertQueryService.getAlertHistory(
                effectiveFrom, effectiveTo, unit, severity, page, Math.min(size, 500));
        return ResponseEntity.ok(alerts);
    }
}
