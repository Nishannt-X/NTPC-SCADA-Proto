package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.entity.MaintenanceScheduleEntity;
import com.ntpc.queryapi.repository.MaintenanceScheduleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/maintenance-schedules")
public class MaintenanceScheduleController {

    private final MaintenanceScheduleRepository repository;

    public MaintenanceScheduleController(MaintenanceScheduleRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<MaintenanceScheduleEntity> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceScheduleEntity> getById(@PathVariable UUID id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public MaintenanceScheduleEntity create(@RequestBody MaintenanceScheduleEntity entity) {
        return repository.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MaintenanceScheduleEntity> update(@PathVariable UUID id, @RequestBody MaintenanceScheduleEntity entity) {
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
