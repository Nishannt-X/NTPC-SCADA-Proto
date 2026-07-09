package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.dto.ResolveRequest;
import com.ntpc.queryapi.entity.AlertEntity;
import com.ntpc.queryapi.repository.AlertRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AlertLifecycleIntegrationTest {

    @Mock
    private AlertRepository alertRepository;

    // Skipping other mocks for brevity in this simple unit test format
    @Mock
    private com.ntpc.queryapi.repository.AuditLogRepository auditLogRepository;
    
    @Mock
    private com.ntpc.queryapi.repository.ThresholdOverrideRepository thresholdOverrideRepository;
    
    @Mock
    private com.ntpc.queryapi.service.CorrelationService correlationService;

    @Mock
    private org.springframework.kafka.core.KafkaTemplate<String, Object> kafkaTemplate;

    @InjectMocks
    private AlertLifecycleController controller;

    @Test
    void testResolveAlert_Success() {
        UUID alertId = UUID.randomUUID();
        AlertEntity alert = new AlertEntity();
        alert.setAlertId(alertId);
        
        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
        
        // Mock SecurityContext (simplified for test since it's just calling static)
        org.springframework.security.core.context.SecurityContextHolder.setContext(
            new org.springframework.security.core.context.SecurityContextImpl(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("testuser", "pass")
            )
        );
        
        ResolveRequest req = new ResolveRequest();
        req.setResolutionType("MANUAL");
        req.setNotes("Fixed the valve");
        
        ResponseEntity<?> response = controller.resolveAlert(alertId, req);
        
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(alert.getResolvedAt());
        assertEquals("testuser", alert.getResolvedBy());
        assertEquals("MANUAL", alert.getResolutionType());
        
        verify(alertRepository, times(1)).save(alert);
    }
}
