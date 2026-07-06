package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.entity.ShiftHandoverEntity;
import com.ntpc.queryapi.repository.ShiftHandoverRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shift-handovers")
public class ShiftHandoverController {

    private final ShiftHandoverRepository repository;

    public ShiftHandoverController(ShiftHandoverRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<ShiftHandoverEntity> getAll() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShiftHandoverEntity> getById(@PathVariable UUID id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ShiftHandoverEntity create(@RequestBody ShiftHandoverEntity entity) {
        return repository.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShiftHandoverEntity> update(@PathVariable UUID id, @RequestBody ShiftHandoverEntity entity) {
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
