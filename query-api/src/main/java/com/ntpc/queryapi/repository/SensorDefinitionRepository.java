package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.SensorDefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SensorDefinitionRepository extends JpaRepository<SensorDefinitionEntity, String> {
}
