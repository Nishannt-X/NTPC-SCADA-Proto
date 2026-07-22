package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.ClockOffLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ClockOffLogRepository extends JpaRepository<ClockOffLogEntity, UUID> {
    List<ClockOffLogEntity> findAllByOrderByClockOffTimeDesc();
}
