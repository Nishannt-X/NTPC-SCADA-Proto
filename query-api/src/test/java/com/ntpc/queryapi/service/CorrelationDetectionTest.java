package com.ntpc.queryapi.service;

import com.ntpc.queryapi.entity.SensorCorrelationEntity;
import com.ntpc.queryapi.repository.SensorCorrelationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CorrelationDetectionTest {

    @Mock
    private SensorCorrelationRepository correlationRepository;

    @InjectMocks
    private CorrelationService correlationService;

    @Test
    void testFindByTrigger_Found() {
        SensorCorrelationEntity correlation = new SensorCorrelationEntity();
        correlation.setTriggerSensorId("SENSOR-1");
        correlation.setName("CORRELATION-1");
        
        when(correlationRepository.findAll()).thenReturn(List.of(correlation));
        
        List<SensorCorrelationEntity> result = correlationService.findByTrigger("SENSOR-1");
        
        assertEquals(1, result.size());
        assertEquals("CORRELATION-1", result.get(0).getName());
    }

    @Test
    void testFindByTrigger_NotFound() {
        SensorCorrelationEntity correlation = new SensorCorrelationEntity();
        correlation.setTriggerSensorId("SENSOR-2"); // Different trigger
        correlation.setName("CORRELATION-2");
        
        when(correlationRepository.findAll()).thenReturn(List.of(correlation));
        
        List<SensorCorrelationEntity> result = correlationService.findByTrigger("SENSOR-1");
        
        assertTrue(result.isEmpty());
    }
}
