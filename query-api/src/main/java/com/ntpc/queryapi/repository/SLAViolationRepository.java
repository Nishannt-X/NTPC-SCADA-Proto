package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.SLAViolationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SLAViolationRepository extends JpaRepository<SLAViolationEntity, java.util.UUID> {
}
