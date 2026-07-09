package com.ntpc.queryapi.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "sensor_definitions")
@Data
public class SensorDefinitionEntity {
    @Id @Column(name = "sensor_id") private String sensorId;
    @Column(name = "unit", nullable = false) private String unit;
    @Column(name = "sensor_type", nullable = false) private String sensorType;
    @Column(name = "location_category", nullable = false) private String locationCategory;
    @Column(name = "location_section", nullable = false) private String locationSection;
    @Column(name = "location_name", nullable = false) private String locationName;
    @Column(name = "equipment_id") private String equipmentId;
    @Column(name = "equipment_type") private String equipmentType;
    @Column(name = "physical_location_description") private String physicalLocationDescription;
    @Column(name = "coordinates_x") private Double coordinatesX;
    @Column(name = "coordinates_y") private Double coordinatesY;
    @Column(name = "coordinates_z") private Double coordinatesZ;
    @Column(name = "sensor_model") private String sensorModel;
    @Column(name = "sensor_range_min") private Double sensorRangeMin;
    @Column(name = "sensor_range_max") private Double sensorRangeMax;
    @Column(name = "sensor_accuracy") private Double sensorAccuracy;
    @Column(name = "installation_date") private Instant installationDate;
    @Column(name = "last_calibration_date") private Instant lastCalibrationDate;
    @Column(name = "next_calibration_due") private Instant nextCalibrationDue;
    @Column(name = "calibration_interval_months") private Integer calibrationIntervalMonths;
    @Column(name = "calibration_accuracy") private Double calibrationAccuracy;
    @Column(name = "is_critical") private Boolean isCritical;
    @Column(name = "failure_mode") private String failureMode;
    @Column(name = "is_active") private Boolean isActive;
    @Column(name = "status") private String status;
    @Column(name = "status_since") private Instant statusSince;

    @Transient private Double warningThreshold;
    @Transient private Double criticalThreshold;
}
