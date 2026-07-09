package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.AlertEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface AlertRepository extends JpaRepository<AlertEntity, UUID> {

    /**
     * Find all currently active (unresolved) alerts, ordered by most recent first.
     */
    @Query(value = """
            SELECT * FROM alert_events
            WHERE resolved_at IS NULL
            ORDER BY fired_at DESC
            """, nativeQuery = true)
    List<AlertEntity> findActiveAlerts();

    /**
     * Historical alerts with optional filters for time range, unit, and severity.
     */
    @Query(value = """
            SELECT * FROM alert_events
            WHERE fired_at >= :fromTime
              AND fired_at <= :toTime
              AND (:unit IS NULL OR unit = :unit)
              AND (:severity IS NULL OR severity = :severity)
            ORDER BY fired_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM alert_events
            WHERE fired_at >= :fromTime
              AND fired_at <= :toTime
              AND (:unit IS NULL OR unit = :unit)
              AND (:severity IS NULL OR severity = :severity)
            """,
            nativeQuery = true)
    Page<AlertEntity> findAlertHistory(
            @Param("fromTime") Instant fromTime,
            @Param("toTime") Instant toTime,
            @Param("unit") String unit,
            @Param("severity") String severity,
            Pageable pageable);

    interface SlaMetricsProjection {
        Long getTotalAlerts();
        Double getAvgAckSeconds();
        Double getAvgResolveSeconds();
        Long getAckBreachCount();
        Long getResolveBreachCount();
    }

    @Query(value = """
            WITH stats AS (
                SELECT 
                    COUNT(*) as total_alerts,
                    AVG(EXTRACT(EPOCH FROM (acknowledged_at - fired_at))) as avg_ack_sec,
                    AVG(EXTRACT(EPOCH FROM (resolved_at - fired_at))) as avg_res_sec,
                    SUM(CASE WHEN (acknowledged_at > ack_deadline OR (acknowledged_at IS NULL AND NOW() > ack_deadline)) THEN 1 ELSE 0 END) as ack_breaches,
                    SUM(CASE WHEN (resolved_at > resolution_deadline OR (resolved_at IS NULL AND NOW() > resolution_deadline)) THEN 1 ELSE 0 END) as res_breaches
                FROM alert_events
                WHERE fired_at >= :fromTime AND fired_at <= :toTime
                  AND (:unit IS NULL OR unit = :unit)
            )
            SELECT 
                COALESCE(total_alerts, 0) as totalAlerts,
                COALESCE(avg_ack_sec, 0) as avgAckSeconds,
                COALESCE(avg_res_sec, 0) as avgResolveSeconds,
                COALESCE(ack_breaches, 0) as ackBreachCount,
                COALESCE(res_breaches, 0) as resolveBreachCount
            FROM stats
            """, nativeQuery = true)
    SlaMetricsProjection getSlaMetrics(@Param("fromTime") Instant fromTime, @Param("toTime") Instant toTime, @Param("unit") String unit);
}
