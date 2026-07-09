package com.ntpc.queryapi.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "audit_log")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long auditId;

    @Column(name = "actor", nullable = false)
    private String actor;

    @Column(name = "actor_role", nullable = false)
    private String actorRole;

    @Column(name = "action_timestamp", insertable = false, updatable = false)
    private Instant actionTimestamp;

    @Column(name = "action_type", nullable = false)
    private String actionType;

    @Column(name = "resource_type", nullable = false)
    private String resourceType;

    @Column(name = "resource_id", nullable = false)
    private String resourceId;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "previous_state", columnDefinition = "jsonb")
    private String previousState;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "new_state", columnDefinition = "jsonb")
    private String newState;

    @Column(name = "details")
    private String details;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "session_id")
    private String sessionId;

    @Column(name = "unit")
    private String unit;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
