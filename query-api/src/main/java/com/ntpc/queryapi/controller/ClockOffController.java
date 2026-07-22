package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.entity.ClockOffLogEntity;
import com.ntpc.queryapi.repository.ClockOffLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clock-off")
@CrossOrigin(origins = "*")
public class ClockOffController {

    private final ClockOffLogRepository clockOffLogRepository;

    public ClockOffController(ClockOffLogRepository clockOffLogRepository) {
        this.clockOffLogRepository = clockOffLogRepository;
    }

    @GetMapping
    public List<ClockOffLogEntity> getClockOffLogs() {
        return clockOffLogRepository.findAllByOrderByClockOffTimeDesc();
    }

    @PostMapping
    @PreAuthorize("hasRole('OPERATOR')")
    public ResponseEntity<ClockOffLogEntity> submitClockOff(@RequestBody Map<String, Object> body) {
        String username = (String) body.get("username");
        int shiftNumber = (Integer) body.get("shiftNumber");
        boolean isEarly = (Boolean) body.get("isEarly");
        String notes = (String) body.get("notes");
        String earlyReason = (String) body.get("earlyReason");

        ClockOffLogEntity log = new ClockOffLogEntity(
                UUID.randomUUID(),
                username,
                Instant.now(),
                shiftNumber,
                isEarly,
                notes,
                earlyReason
        );

        clockOffLogRepository.save(log);
        return ResponseEntity.ok(log);
    }
}
