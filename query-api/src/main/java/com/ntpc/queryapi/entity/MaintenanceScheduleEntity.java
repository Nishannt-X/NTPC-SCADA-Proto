package com.ntpc.queryapi.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "maintenance_schedules")
@Data
public class MaintenanceScheduleEntity {
    @Id @Column(name = "maintenance_id") private UUID maintenanceId;
    @Column(name = "sensor_id", nullable = false) private String sensorId;
    @Column(name = "maintenance_type", nullable = false) private String maintenanceType;
    @Column(name = "scheduled_date", nullable = false) private Instant scheduledDate;
    @Column(name = "completed_at") private Instant completedAt;
    @Column(name = "completed_by") private String completedBy;
    @Column(name = "notes") private String notes;
    @Column(name = "next_due_date") private Instant nextDueDate;
    @Column(name = "status") private String status;
}
