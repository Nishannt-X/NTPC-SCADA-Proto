package com.ntpc.ingestion.repository;

import com.ntpc.ingestion.entity.SensorReadingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SensorReadingRepository extends JpaRepository<SensorReadingEntity, Long> {
}
