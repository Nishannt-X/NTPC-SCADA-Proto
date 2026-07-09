package com.ntpc.queryapi.service;

import com.ntpc.queryapi.entity.AlertEntity;
import com.ntpc.queryapi.entity.SLADefinitionEntity;
import com.ntpc.queryapi.entity.SLAViolationEntity;
import com.ntpc.queryapi.repository.SLADefinitionRepository;
import com.ntpc.queryapi.repository.SLAViolationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SLAViolationTest {

    @Mock
    private SLADefinitionRepository definitionRepository;

    @Mock
    private SLAViolationRepository violationRepository;

    @InjectMocks
    private SLAService slaService;

    @Test
    void testCheckAndRecordViolations_NoViolation() {
        AlertEntity alert = new AlertEntity();
        alert.setAlertId(UUID.randomUUID());
        alert.setAckDeadline(Instant.now().plusSeconds(3600)); // Future deadline
        alert.setAcknowledgedAt(null);
        
        slaService.checkAndRecordViolations(alert);
        
        verify(violationRepository, never()).save(any());
    }

    @Test
    void testCheckAndRecordViolations_AckMissed() {
        AlertEntity alert = new AlertEntity();
        alert.setAlertId(UUID.randomUUID());
        alert.setAckDeadline(Instant.now().minusSeconds(3600)); // Past deadline
        alert.setAcknowledgedAt(null); // Not acknowledged
        
        slaService.checkAndRecordViolations(alert);
        
        ArgumentCaptor<SLAViolationEntity> captor = ArgumentCaptor.forClass(SLAViolationEntity.class);
        verify(violationRepository, times(1)).save(captor.capture());
        
        SLAViolationEntity violation = captor.getValue();
        assertEquals("ACK_MISSED", violation.getViolationType());
        assertEquals(alert.getAlertId(), violation.getAlertId());
        assertTrue(violation.getMinutesLate() >= 60);
    }
}
