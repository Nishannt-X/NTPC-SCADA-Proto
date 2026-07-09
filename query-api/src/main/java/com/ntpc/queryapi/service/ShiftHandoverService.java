package com.ntpc.queryapi.service;

import com.ntpc.queryapi.entity.ShiftHandoverEntity;
import com.ntpc.queryapi.repository.ShiftHandoverRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
public class ShiftHandoverService {

    private final ShiftHandoverRepository handoverRepository;
    private final com.ntpc.queryapi.repository.AlertRepository alertRepository;

    public ShiftHandoverService(ShiftHandoverRepository handoverRepository, com.ntpc.queryapi.repository.AlertRepository alertRepository) {
        this.handoverRepository = handoverRepository;
        this.alertRepository = alertRepository;
    }

    public ShiftHandoverEntity startHandover(String outgoing, String incoming, int shiftNumber) {
        ShiftHandoverEntity handover = new ShiftHandoverEntity();
        handover.setHandoverId(UUID.randomUUID());
        handover.setShiftNumber(shiftNumber);
        handover.setShiftStart(Instant.now().minus(java.time.Duration.ofHours(8))); // approximate
        handover.setShiftEnd(Instant.now());
        handover.setOperatorOutgoing(outgoing);
        handover.setOperatorIncoming(incoming);
        
        // Query actual active alerts for state snapshot
        java.util.List<com.ntpc.queryapi.entity.AlertEntity> activeAlerts = alertRepository.findActiveAlerts();
        
        long criticalCount = activeAlerts.stream().filter(a -> "CRITICAL".equalsIgnoreCase(a.getSeverity())).count();
        
        handover.setActiveAlertsCount(activeAlerts.size());
        handover.setResolvedAlertsCount(0); // Optional: count resolved in last 8 hrs
        handover.setCriticalAlertsCount((int) criticalCount);
        
        return handoverRepository.save(handover);
    }
}
