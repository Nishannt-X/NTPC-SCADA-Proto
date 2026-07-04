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
            SELECT * FROM alerts
            WHERE resolved_at IS NULL
            ORDER BY triggered_at DESC
            """, nativeQuery = true)
    List<AlertEntity> findActiveAlerts();

    /**
     * Historical alerts with optional filters for time range, unit, and severity.
     */
    @Query(value = """
            SELECT * FROM alerts
            WHERE triggered_at >= :fromTime
              AND triggered_at <= :toTime
              AND (:unit IS NULL OR unit = :unit)
              AND (:severity IS NULL OR severity = :severity)
            ORDER BY triggered_at DESC
            """,
            countQuery = """
            SELECT count(*) FROM alerts
            WHERE triggered_at >= :fromTime
              AND triggered_at <= :toTime
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
}
