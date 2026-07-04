package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.dto.SensorReadingResponse;
import com.ntpc.queryapi.service.ReadingQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ReadingsController {

    private final ReadingQueryService readingQueryService;

    /**
     * GET /api/v1/units/{unitId}/readings/latest
     * Returns the most recent reading for each sensor in the given unit.
     */
    @GetMapping("/units/{unitId}/readings/latest")
    public ResponseEntity<List<SensorReadingResponse>> getLatestReadings(
            @PathVariable String unitId) {
        List<SensorReadingResponse> readings = readingQueryService.getLatestReadings(unitId);
        return ResponseEntity.ok(readings);
    }

    /**
     * GET /api/v1/units/{unitId}/readings?from=&to=&sensorType=&page=&size=
     * Historical time-range query with optional sensor type filter and pagination.
     */
    @GetMapping("/units/{unitId}/readings")
    public ResponseEntity<Page<SensorReadingResponse>> getHistoricalReadings(
            @PathVariable String unitId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) String sensorType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        Page<SensorReadingResponse> readings = readingQueryService.getHistoricalReadings(
                unitId, from, to, sensorType, page, Math.min(size, 1000));
        return ResponseEntity.ok(readings);
    }
}
