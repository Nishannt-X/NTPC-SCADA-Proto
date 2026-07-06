package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.entity.SharedSystemEntity;
import com.ntpc.queryapi.repository.SharedSystemRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shared-systems")
public class SharedSystemController {

    private final SharedSystemRepository repository;

    public SharedSystemController(SharedSystemRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<SharedSystemEntity> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<SharedSystemEntity> getById(@PathVariable UUID id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public SharedSystemEntity create(@RequestBody SharedSystemEntity entity) {
        return repository.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SharedSystemEntity> update(@PathVariable UUID id, @RequestBody SharedSystemEntity entity) {
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
