package com.ntpc.queryapi.service;

import com.ntpc.queryapi.dto.ThresholdDTO;
import com.ntpc.queryapi.entity.ThresholdDefinitionEntity;
import com.ntpc.queryapi.entity.ThresholdOverrideEntity;
import com.ntpc.queryapi.repository.ThresholdDefinitionRepository;
import com.ntpc.queryapi.repository.ThresholdOverrideRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class ThresholdService {

    private final ThresholdDefinitionRepository definitionRepository;
    private final ThresholdOverrideRepository overrideRepository;

    public ThresholdService(ThresholdDefinitionRepository definitionRepository, ThresholdOverrideRepository overrideRepository) {
        this.definitionRepository = definitionRepository;
        this.overrideRepository = overrideRepository;
    }

    public ThresholdDTO getEffectiveThreshold(String sensorId) {
        List<ThresholdDefinitionEntity> defs = definitionRepository.findBySensorId(sensorId);
        if (defs.isEmpty()) {
            return ThresholdDTO.builder().sensorId(sensorId).warning(0.0).critical(0.0).isOverrideActive(false).build();
        }
        
        ThresholdDefinitionEntity def = defs.get(0); // Assuming the most active one
        
        List<ThresholdOverrideEntity> overrides = overrideRepository.findBySensorId(sensorId);
        ThresholdOverrideEntity activeOverride = overrides.stream()
                .filter(o -> "ACTIVE".equals(o.getStatus()) && Instant.now().isBefore(o.getExpiresAt()))
                .findFirst()
                .orElse(null);
                
        if (activeOverride != null) {
            return ThresholdDTO.builder()
                    .sensorId(sensorId)
                    .warning(activeOverride.getNewWarning())
                    .critical(activeOverride.getNewCritical())
                    .isOverrideActive(true)
                    .build();
        }
        
        return ThresholdDTO.builder()
                .sensorId(sensorId)
                .warning(def.getWarningThreshold())
                .critical(def.getCriticalThreshold())
                .isOverrideActive(false)
                .build();
    }
}
