import os

repos_dir = "/Users/nishantdahiya/Documents/ntpc-lara-telemetry/query-api/src/main/java/com/ntpc/queryapi/repository"
controllers_dir = "/Users/nishantdahiya/Documents/ntpc-lara-telemetry/query-api/src/main/java/com/ntpc/queryapi/controller"

entities_info = [
    ("SensorDefinitionEntity", "String", "SensorDefinitionRepository", "SensorDefinitionController", "sensor-definitions"),
    ("ThresholdDefinitionEntity", "java.util.UUID", "ThresholdDefinitionRepository", "ThresholdDefinitionController", "threshold-definitions"),
    ("SensorCorrelationEntity", "java.util.UUID", "SensorCorrelationRepository", "SensorCorrelationController", "sensor-correlations"),
    ("SLADefinitionEntity", "java.util.UUID", "SLADefinitionRepository", "SLADefinitionController", "sla-definitions"),
    ("SLAViolationEntity", "java.util.UUID", "SLAViolationRepository", "SLAViolationController", "sla-violations"),
    ("MaintenanceScheduleEntity", "java.util.UUID", "MaintenanceScheduleRepository", "MaintenanceScheduleController", "maintenance-schedules"),
    ("SharedSystemEntity", "java.util.UUID", "SharedSystemRepository", "SharedSystemController", "shared-systems"),
    ("ShiftHandoverEntity", "java.util.UUID", "ShiftHandoverRepository", "ShiftHandoverController", "shift-handovers"),
]

for entity, id_type, repo, controller, api_path in entities_info:
    # Generate Repository
    repo_content = f"""package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.{entity};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface {repo} extends JpaRepository<{entity}, {id_type}> {{
}}
"""
    with open(os.path.join(repos_dir, f"{repo}.java"), "w") as f:
        f.write(repo_content)

    # Generate Controller
    id_param_type = id_type.split('.')[-1]
    controller_content = f"""package com.ntpc.queryapi.controller;

import com.ntpc.queryapi.entity.{entity};
import com.ntpc.queryapi.repository.{repo};
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/{api_path}")
public class {controller} {{

    private final {repo} repository;

    public {controller}({repo} repository) {{
        this.repository = repository;
    }}

    @GetMapping
    public List<{entity}> getAll() {{
        return repository.findAll();
    }}

    @GetMapping("/{{id}}")
    public ResponseEntity<{entity}> getById(@PathVariable {id_param_type} id) {{
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }}

    @PostMapping
    public {entity} create(@RequestBody {entity} entity) {{
        return repository.save(entity);
    }}

    @PutMapping("/{{id}}")
    public ResponseEntity<{entity}> update(@PathVariable {id_param_type} id, @RequestBody {entity} entity) {{
        if (!repository.existsById(id)) {{
            return ResponseEntity.notFound().build();
        }}
        // The ID should be maintained, simple save strategy for demonstration
        return ResponseEntity.ok(repository.save(entity));
    }}

    @DeleteMapping("/{{id}}")
    public ResponseEntity<Void> delete(@PathVariable {id_param_type} id) {{
        if (!repository.existsById(id)) {{
            return ResponseEntity.notFound().build();
        }}
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }}
}}
"""
    with open(os.path.join(controllers_dir, f"{controller}.java"), "w") as f:
        f.write(controller_content)

