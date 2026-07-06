package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.SensorCorrelationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SensorCorrelationRepository extends JpaRepository<SensorCorrelationEntity, java.util.UUID> {
}
