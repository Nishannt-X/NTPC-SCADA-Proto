package com.ntpc.queryapi.service;

import com.ntpc.queryapi.entity.MaintenanceScheduleEntity;
import com.ntpc.queryapi.repository.MaintenanceScheduleRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MaintenanceService {

    private final MaintenanceScheduleRepository maintenanceRepository;

    public MaintenanceService(MaintenanceScheduleRepository maintenanceRepository) {
        this.maintenanceRepository = maintenanceRepository;
    }

    public List<MaintenanceScheduleEntity> getOverdueMaintenance() {
        return maintenanceRepository.findAll().stream()
                .filter(m -> "OVERDUE".equals(m.getStatus()) || 
                        (m.getScheduledDate() != null && m.getScheduledDate().isBefore(java.time.Instant.now()) && !"COMPLETED".equals(m.getStatus())))
                .toList();
    }
    
    public List<MaintenanceScheduleEntity> getDueInNextDays(int days) {
        java.time.Instant horizon = java.time.Instant.now().plus(java.time.Duration.ofDays(days));
        return maintenanceRepository.findAll().stream()
                .filter(m -> "SCHEDULED".equals(m.getStatus()) && m.getScheduledDate() != null && m.getScheduledDate().isBefore(horizon))
                .toList();
    }
}
