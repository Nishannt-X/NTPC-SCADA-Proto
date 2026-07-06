package com.ntpc.queryapi.repository;

import com.ntpc.queryapi.entity.MaintenanceScheduleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaintenanceScheduleRepository extends JpaRepository<MaintenanceScheduleEntity, java.util.UUID> {
}
