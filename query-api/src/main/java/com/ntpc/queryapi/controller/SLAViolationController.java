package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.entity.SLAViolationEntity;
import com.ntpc.queryapi.repository.SLAViolationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sla-violations")
public class SLAViolationController {

    private final SLAViolationRepository repository;

    public SLAViolationController(SLAViolationRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<SLAViolationEntity> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SLAViolationEntity> getById(@PathVariable UUID id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public SLAViolationEntity create(@RequestBody SLAViolationEntity entity) {
        return repository.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SLAViolationEntity> update(@PathVariable UUID id, @RequestBody SLAViolationEntity entity) {
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
