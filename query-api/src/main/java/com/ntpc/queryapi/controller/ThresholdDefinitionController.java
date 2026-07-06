package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.entity.ThresholdDefinitionEntity;
import com.ntpc.queryapi.repository.ThresholdDefinitionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/threshold-definitions")
public class ThresholdDefinitionController {

    private final ThresholdDefinitionRepository repository;

    public ThresholdDefinitionController(ThresholdDefinitionRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<ThresholdDefinitionEntity> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ThresholdDefinitionEntity> getById(@PathVariable UUID id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ThresholdDefinitionEntity create(@RequestBody ThresholdDefinitionEntity entity) {
        return repository.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ThresholdDefinitionEntity> update(@PathVariable UUID id, @RequestBody ThresholdDefinitionEntity entity) {
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
