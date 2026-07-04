package com.ntpc.queryapi.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * JPA entity for reading from the sensor_readings hypertable.
 * Read-only from Query API's perspective.
 */
@Entity
@Table(name = "sensor_readings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorReadingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sensor_readings_seq")
    @SequenceGenerator(name = "sensor_readings_seq", sequenceName = "sensor_readings_id_seq", allocationSize = 1)
    private Long id;

    @Column(name = "sensor_id", nullable = false)
    private String sensorId;

    @Column(name = "unit", nullable = false)
    private String unit;

    @Column(name = "sensor_type", nullable = false)
    private String sensorType;

    @Column(name = "value", nullable = false)
    private Double value;

    @Column(name = "unit_of_measure", nullable = false)
    private String unitOfMeasure;

    @Column(name = "reading_time", nullable = false)
    private Instant readingTime;
}
