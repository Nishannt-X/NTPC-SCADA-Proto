package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.SLADefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SLADefinitionRepository extends JpaRepository<SLADefinitionEntity, java.util.UUID> {
    @org.springframework.data.jpa.repository.Query(value = "SELECT * FROM sla_definitions WHERE active = true AND alert_severity = :severity AND (unit IS NULL OR unit = :unit) AND (sensor_type IS NULL OR sensor_type = :sensorType) LIMIT 1", nativeQuery = true)
    java.util.Optional<SLADefinitionEntity> findApplicableSLA(
        @org.springframework.data.repository.query.Param("severity") String severity,
        @org.springframework.data.repository.query.Param("unit") String unit,
        @org.springframework.data.repository.query.Param("sensorType") String sensorType
    );
}
