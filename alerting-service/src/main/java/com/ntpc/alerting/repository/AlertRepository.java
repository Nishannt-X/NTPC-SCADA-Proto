package com.ntpc.alerting.repository;

import com.ntpc.alerting.entity.AlertEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlertRepository extends JpaRepository<AlertEntity, UUID> {

    /**
     * Find existing unresolved alert for the same sensor and severity
     * (for deduplication purposes).
     */
    @Query(value = """
            SELECT * FROM alerts
            WHERE sensor_id = :sensorId
              AND severity = :severity
              AND resolved_at IS NULL
            ORDER BY triggered_at DESC
            LIMIT 1
            """, nativeQuery = true)
    Optional<AlertEntity> findActiveAlertBySensorAndSeverity(
            @Param("sensorId") String sensorId,
            @Param("severity") String severity);

    /**
     * Find all unresolved alerts whose last_seen_at is older than the given cutoff.
     * These are candidates for auto-resolution.
     */
    @Query(value = """
            SELECT * FROM alerts
            WHERE resolved_at IS NULL
              AND last_seen_at < :cutoff
            """, nativeQuery = true)
    List<AlertEntity> findStaleUnresolvedAlerts(@Param("cutoff") Instant cutoff);

    /**
     * Auto-resolve stale alerts in bulk.
     */
    @Modifying
    @Query(value = """
            UPDATE alerts SET resolved_at = :resolvedAt
            WHERE resolved_at IS NULL
              AND last_seen_at < :cutoff
            """, nativeQuery = true)
    int resolveStaleAlerts(@Param("cutoff") Instant cutoff, @Param("resolvedAt") Instant resolvedAt);
}
