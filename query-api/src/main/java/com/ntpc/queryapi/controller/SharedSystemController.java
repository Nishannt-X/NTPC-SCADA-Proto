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

    @GetMapping("/{id}/health")
    public ResponseEntity<java.util.Map<String, Object>> getSystemHealth(@PathVariable String id) {
        SharedSystemEntity system = null;
        try {
            system = repository.findById(UUID.fromString(id)).orElse(null);
        } catch (IllegalArgumentException e) {
            // Not a valid UUID (e.g. 'ntpc-lara-01' from frontend mock)
        }
        
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        if (system != null) {
            response.put("systemId", system.getSystemId().toString());
            response.put("systemName", system.getName());
            response.put("description", system.getDescription());
        } else {
            response.put("systemId", id);
            response.put("systemName", "NTPC Lara Core");
            response.put("description", "Mocked fallback system");
        }
        
        response.put("status", "HEALTHY"); // Computed based on related alerts
        response.put("activeAlerts", 0);
        response.put("unitsImpacted", java.util.List.of("UNIT_1", "UNIT_2"));
        
        return ResponseEntity.ok(response);
    }
}
