package com.ntpc.queryapi.service;

import com.ntpc.queryapi.dto.ThresholdDTO;
import com.ntpc.queryapi.entity.ThresholdDefinitionEntity;
import com.ntpc.queryapi.entity.ThresholdOverrideEntity;
import com.ntpc.queryapi.repository.ThresholdDefinitionRepository;
import com.ntpc.queryapi.repository.ThresholdOverrideRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ThresholdOverrideExpiryTest {

    @Mock
    private ThresholdDefinitionRepository definitionRepository;

    @Mock
    private ThresholdOverrideRepository overrideRepository;

    @InjectMocks
    private ThresholdService thresholdService;

    @Test
    void testGetEffectiveThreshold_NoActiveOverride() {
        String sensorId = "UNIT1-TEMP";
        
        ThresholdDefinitionEntity def = new ThresholdDefinitionEntity();
        def.setSensorId(sensorId);
        def.setWarningThreshold(50.0);
        def.setCriticalThreshold(75.0);
        
        when(definitionRepository.findBySensorId(sensorId)).thenReturn(List.of(def));
        when(overrideRepository.findBySensorId(sensorId)).thenReturn(List.of());
        
        ThresholdDTO result = thresholdService.getEffectiveThreshold(sensorId);
        
        assertEquals(50.0, result.getWarning());
        assertEquals(75.0, result.getCritical());
        assertFalse(result.isOverrideActive());
    }

    @Test
    void testGetEffectiveThreshold_WithActiveOverride() {
        String sensorId = "UNIT1-TEMP";
        
        ThresholdDefinitionEntity def = new ThresholdDefinitionEntity();
        def.setSensorId(sensorId);
        def.setWarningThreshold(50.0);
        def.setCriticalThreshold(75.0);
        
        ThresholdOverrideEntity override = new ThresholdOverrideEntity();
        override.setSensorId(sensorId);
        override.setStatus("ACTIVE");
        override.setNewWarning(60.0);
        override.setNewCritical(85.0);
        override.setExpiresAt(Instant.now().plusSeconds(3600)); // Future expiry
        
        when(definitionRepository.findBySensorId(sensorId)).thenReturn(List.of(def));
        when(overrideRepository.findBySensorId(sensorId)).thenReturn(List.of(override));
        
        ThresholdDTO result = thresholdService.getEffectiveThreshold(sensorId);
        
        assertEquals(60.0, result.getWarning());
        assertEquals(85.0, result.getCritical());
        assertTrue(result.isOverrideActive());
    }

    @Test
    void testGetEffectiveThreshold_WithExpiredOverride() {
        String sensorId = "UNIT1-TEMP";
        
        ThresholdDefinitionEntity def = new ThresholdDefinitionEntity();
        def.setSensorId(sensorId);
        def.setWarningThreshold(50.0);
        def.setCriticalThreshold(75.0);
        
        ThresholdOverrideEntity override = new ThresholdOverrideEntity();
        override.setSensorId(sensorId);
        override.setStatus("ACTIVE");
        override.setNewWarning(60.0);
        override.setNewCritical(85.0);
        override.setExpiresAt(Instant.now().minusSeconds(3600)); // Past expiry
        
        when(definitionRepository.findBySensorId(sensorId)).thenReturn(List.of(def));
        when(overrideRepository.findBySensorId(sensorId)).thenReturn(List.of(override));
        
        ThresholdDTO result = thresholdService.getEffectiveThreshold(sensorId);
        
        assertEquals(50.0, result.getWarning()); // Should fall back to definition
        assertEquals(75.0, result.getCritical());
        assertFalse(result.isOverrideActive());
    }
}
