package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.ThresholdOverrideEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ThresholdOverrideRepository extends JpaRepository<ThresholdOverrideEntity, Long> {
    List<ThresholdOverrideEntity> findBySensorId(String sensorId);
    List<ThresholdOverrideEntity> findByExpiresAtAfter(java.time.Instant now);
}
