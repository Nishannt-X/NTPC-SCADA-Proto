package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.entity.SLADefinitionEntity;
import com.ntpc.queryapi.repository.SLADefinitionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sla-definitions")
public class SLADefinitionController {

    private final SLADefinitionRepository repository;

    public SLADefinitionController(SLADefinitionRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<SLADefinitionEntity> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SLADefinitionEntity> getById(@PathVariable UUID id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public SLADefinitionEntity create(@RequestBody SLADefinitionEntity entity) {
        return repository.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SLADefinitionEntity> update(@PathVariable UUID id, @RequestBody SLADefinitionEntity entity) {
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
