package com.ntpc.queryapi.service;

import com.ntpc.queryapi.entity.AlertEntity;
import com.ntpc.queryapi.entity.SLADefinitionEntity;
import com.ntpc.queryapi.entity.SLAViolationEntity;
import com.ntpc.queryapi.repository.SLADefinitionRepository;
import com.ntpc.queryapi.repository.SLAViolationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class SLAService {

    private final SLADefinitionRepository slaDefinitionRepository;
    private final SLAViolationRepository slaViolationRepository;

    public SLAService(SLADefinitionRepository slaDefinitionRepository, SLAViolationRepository slaViolationRepository) {
        this.slaDefinitionRepository = slaDefinitionRepository;
        this.slaViolationRepository = slaViolationRepository;
    }

    public SLADefinitionEntity findApplicable(AlertEntity alert) {
        return slaDefinitionRepository.findApplicableSLA(
                alert.getSeverity(),
                alert.getUnit(),
                alert.getSensorType()
        ).orElse(null);
    }

    public List<SLAViolationEntity> findViolations(UUID alertId) {
        // We'll need a custom query in SLAViolationRepository or we can just fetch all by alertId
        return slaViolationRepository.findAll().stream()
                .filter(v -> v.getAlertId().equals(alertId))
                .toList();
    }

    public void checkAndRecordViolations(AlertEntity alert) {
        if (alert.getAckDeadline() != null && alert.getAcknowledgedAt() == null && Instant.now().isAfter(alert.getAckDeadline())) {
            recordViolation(alert.getAlertId(), null, "ACK_MISSED", alert.getAckDeadline());
        }
        
        if (alert.getResolutionDeadline() != null && alert.getResolvedAt() == null && Instant.now().isAfter(alert.getResolutionDeadline())) {
            recordViolation(alert.getAlertId(), null, "RESOLUTION_MISSED", alert.getResolutionDeadline());
        }
    }

    private void recordViolation(UUID alertId, UUID slaId, String type, Instant expected) {
        SLAViolationEntity violation = new SLAViolationEntity();
        violation.setViolationId(UUID.randomUUID());
        violation.setAlertId(alertId);
        violation.setSlaId(slaId != null ? slaId : UUID.randomUUID()); // Fallback if SLA ID is not provided
        violation.setViolationType(type);
        violation.setExpectedTime(expected);
        violation.setActualTime(Instant.now());
        violation.setMinutesLate((int) ChronoUnit.MINUTES.between(expected, Instant.now()));
        violation.setReportedAt(Instant.now());
        
        slaViolationRepository.save(violation);
    }
}
