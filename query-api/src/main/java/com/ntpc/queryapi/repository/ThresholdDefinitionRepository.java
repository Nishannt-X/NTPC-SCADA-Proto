package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.ThresholdDefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ThresholdDefinitionRepository extends JpaRepository<ThresholdDefinitionEntity, java.util.UUID> {
}
