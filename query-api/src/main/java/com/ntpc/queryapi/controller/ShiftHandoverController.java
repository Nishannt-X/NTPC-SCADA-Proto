package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.entity.ShiftHandoverEntity;
import com.ntpc.queryapi.repository.ShiftHandoverRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/shift-handovers")
@org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('OPERATOR', 'SHIFT_CHARGE_ENGINEER', 'ADMIN')")
public class ShiftHandoverController {

    private final ShiftHandoverRepository repository;
    private final com.ntpc.queryapi.service.ShiftHandoverService service;
    private final org.springframework.kafka.core.KafkaTemplate<String, Object> kafkaTemplate;

    public ShiftHandoverController(ShiftHandoverRepository repository, com.ntpc.queryapi.service.ShiftHandoverService service, org.springframework.kafka.core.KafkaTemplate<String, Object> kafkaTemplate) {
        this.repository = repository;
        this.service = service;
        this.kafkaTemplate = kafkaTemplate;
    }

    @GetMapping
    public List<ShiftHandoverEntity> getAll() {
        return repository.findAll();
    }

    @GetMapping("/current")
    public ResponseEntity<ShiftHandoverEntity> getCurrent() {
        // Just return the most recent one for now
        return repository.findAll().stream()
                .max((a, b) -> a.getShiftStart().compareTo(b.getShiftStart()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShiftHandoverEntity> getById(@PathVariable UUID id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/start")
    public ResponseEntity<ShiftHandoverEntity> startHandover(@RequestBody java.util.Map<String, Object> req) {
        String outgoing = (String) req.get("operatorOutgoing");
        String incoming = (String) req.get("operatorIncoming");
        int shiftNumber = (Integer) req.get("shiftNumber");
        
        ShiftHandoverEntity handover = service.startHandover(outgoing, incoming, shiftNumber);
        
        java.util.Map<String, Object> event = new java.util.HashMap<>();
        event.put("handoverId", handover.getHandoverId());
        event.put("outgoing", outgoing);
        event.put("incoming", incoming);
        
        kafkaTemplate.send("shift-handover-events", handover.getHandoverId().toString(), event);
        
        return ResponseEntity.ok(handover);
    }

    @PutMapping("/{id}/outgoing-notes")
    public ResponseEntity<?> setOutgoingNotes(@PathVariable UUID id, @RequestBody java.util.Map<String, String> req) {
        ShiftHandoverEntity entity = repository.findById(id).orElseThrow();
        entity.setOutgoingNotes(req.get("notes"));
        repository.save(entity);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/incoming-acknowledgment")
    public ResponseEntity<?> setIncomingAcknowledgment(@PathVariable UUID id, @RequestBody java.util.Map<String, String> req) {
        ShiftHandoverEntity entity = repository.findById(id).orElseThrow();
        entity.setIncomingAcknowledgment(req.get("acknowledgment"));
        entity.setCompletedAt(java.time.Instant.now());
        repository.save(entity);
        return ResponseEntity.ok().build();
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
