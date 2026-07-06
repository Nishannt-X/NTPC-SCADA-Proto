package com.ntpc.queryapi.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "shared_systems")
@Data
public class SharedSystemEntity {
    @Id @Column(name = "system_id") private UUID systemId;
    @Column(name = "name", nullable = false) private String name;
    @Column(name = "description") private String description;
    @Column(name = "failure_description") private String failureDescription;
    @Column(name = "consequences_if_failed") private String consequencesIfFailed;
    @Column(name = "recommended_action_on_failure") private String recommendedActionOnFailure;
}
