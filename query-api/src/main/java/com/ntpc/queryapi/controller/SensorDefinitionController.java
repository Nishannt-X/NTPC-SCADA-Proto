package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.entity.SensorDefinitionEntity;
import com.ntpc.queryapi.repository.SensorDefinitionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/sensor-definitions")
public class SensorDefinitionController {

    private final SensorDefinitionRepository repository;
    private final com.ntpc.queryapi.service.MaintenanceService maintenanceService;
    private final org.springframework.kafka.core.KafkaTemplate<String, Object> kafkaTemplate;

    private final com.ntpc.queryapi.repository.ThresholdDefinitionRepository thresholdRepository;

    public SensorDefinitionController(SensorDefinitionRepository repository, com.ntpc.queryapi.service.MaintenanceService maintenanceService, org.springframework.kafka.core.KafkaTemplate<String, Object> kafkaTemplate, com.ntpc.queryapi.repository.ThresholdDefinitionRepository thresholdRepository) {
        this.repository = repository;
        this.maintenanceService = maintenanceService;
        this.kafkaTemplate = kafkaTemplate;
        this.thresholdRepository = thresholdRepository;
    }

    @GetMapping
    public List<SensorDefinitionEntity> getAll() {
        List<SensorDefinitionEntity> sensors = repository.findAll();
        List<com.ntpc.queryapi.entity.ThresholdDefinitionEntity> thresholds = thresholdRepository.findAll();
        java.util.Map<String, com.ntpc.queryapi.entity.ThresholdDefinitionEntity> thresholdMap = thresholds.stream()
            .collect(java.util.stream.Collectors.toMap(com.ntpc.queryapi.entity.ThresholdDefinitionEntity::getSensorId, t -> t, (t1, t2) -> t1));
            
        sensors.forEach(s -> {
            com.ntpc.queryapi.entity.ThresholdDefinitionEntity t = thresholdMap.get(s.getSensorId());
            if (t != null) {
                s.setWarningThreshold(t.getWarningThreshold());
                s.setCriticalThreshold(t.getCriticalThreshold());
            }
        });
        return sensors;
    }

    @GetMapping("/maintenance-due")
    public ResponseEntity<java.util.Map<String, Object>> getMaintenanceDue() {
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        
        java.util.List<com.ntpc.queryapi.entity.MaintenanceScheduleEntity> overdue = maintenanceService.getOverdueMaintenance();
        java.util.List<com.ntpc.queryapi.entity.MaintenanceScheduleEntity> dueNext7Days = maintenanceService.getDueInNextDays(7);
        
        response.put("overdueCount", overdue.size());
        response.put("dueInNext7Days", dueNext7Days.size());
        response.put("overdue", overdue);
        response.put("dueNext7Days", dueNext7Days);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SensorDefinitionEntity> getById(@PathVariable String id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public SensorDefinitionEntity create(@RequestBody SensorDefinitionEntity entity) {
        return repository.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SensorDefinitionEntity> update(@PathVariable String id, @RequestBody SensorDefinitionEntity entity) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        // The ID should be maintained, simple save strategy for demonstration
        return ResponseEntity.ok(repository.save(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/maintenance-complete")
    public ResponseEntity<?> markMaintenanceComplete(@PathVariable String id) {
        SensorDefinitionEntity sensor = repository.findById(id).orElseThrow();
        // Assuming there is some logic to update maintenance dates...
        
        java.util.Map<String, Object> event = new java.util.HashMap<>();
        event.put("sensorId", id);
        event.put("status", "COMPLETED");
        event.put("completedAt", java.time.Instant.now().toString());
        
        kafkaTemplate.send("maintenance-events", id, event);
        
        return ResponseEntity.ok().build();
    }
}
