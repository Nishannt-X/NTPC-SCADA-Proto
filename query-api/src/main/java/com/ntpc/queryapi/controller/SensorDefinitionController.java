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

    public SensorDefinitionController(SensorDefinitionRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<SensorDefinitionEntity> getAll() {
        return repository.findAll();
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
}
