package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.SLADefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SLADefinitionRepository extends JpaRepository<SLADefinitionEntity, java.util.UUID> {
}
