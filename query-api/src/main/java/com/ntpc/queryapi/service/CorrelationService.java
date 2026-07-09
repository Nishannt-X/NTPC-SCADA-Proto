package com.ntpc.queryapi.service;

import com.ntpc.queryapi.entity.SensorCorrelationEntity;
import com.ntpc.queryapi.repository.SensorCorrelationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CorrelationService {

    private final SensorCorrelationRepository correlationRepository;

    public CorrelationService(SensorCorrelationRepository correlationRepository) {
        this.correlationRepository = correlationRepository;
    }

    public List<SensorCorrelationEntity> findByTrigger(String sensorId) {
        return correlationRepository.findAll().stream()
                .filter(c -> sensorId.equals(c.getTriggerSensorId()))
                .toList();
    }
}
