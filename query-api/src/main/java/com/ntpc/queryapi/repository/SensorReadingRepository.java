package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.SensorReadingEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SensorReadingRepository extends JpaRepository<SensorReadingEntity, Long> {

    /**
     * Get the most recent reading for each sensor in the given unit.
     * Uses PostgreSQL's DISTINCT ON for efficient "latest per group" queries.
     */
    @Query(value = """
            SELECT DISTINCT ON (sensor_id) *
            FROM sensor_readings
            WHERE unit = :unitId
            ORDER BY sensor_id, reading_time DESC
            """, nativeQuery = true)
    List<SensorReadingEntity> findLatestByUnit(@Param("unitId") String unitId);

    /**
     * Historical readings with time range, optional sensor type filter, and pagination.
     */
    @Query(value = """
            SELECT * FROM sensor_readings
            WHERE unit = :unitId
              AND reading_time >= :fromTime
              AND reading_time <= :toTime
              AND (:sensorType IS NULL OR sensor_type = :sensorType)
            ORDER BY reading_time DESC
            """,
            countQuery = """
            SELECT count(*) FROM sensor_readings
            WHERE unit = :unitId
              AND reading_time >= :fromTime
              AND reading_time <= :toTime
              AND (:sensorType IS NULL OR sensor_type = :sensorType)
            """,
            nativeQuery = true)
    Page<SensorReadingEntity> findByUnitAndTimeRange(
            @Param("unitId") String unitId,
            @Param("fromTime") Instant fromTime,
            @Param("toTime") Instant toTime,
            @Param("sensorType") String sensorType,
            Pageable pageable);
}
