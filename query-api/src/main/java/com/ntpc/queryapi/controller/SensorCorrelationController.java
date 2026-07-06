package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.entity.SensorCorrelationEntity;
import com.ntpc.queryapi.repository.SensorCorrelationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sensor-correlations")
public class SensorCorrelationController {

    private final SensorCorrelationRepository repository;

    public SensorCorrelationController(SensorCorrelationRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<SensorCorrelationEntity> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SensorCorrelationEntity> getById(@PathVariable UUID id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public SensorCorrelationEntity create(@RequestBody SensorCorrelationEntity entity) {
        return repository.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SensorCorrelationEntity> update(@PathVariable UUID id, @RequestBody SensorCorrelationEntity entity) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        // The ID should be maintained, simple save strategy for demonstration
        return ResponseEntity.ok(repository.save(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
