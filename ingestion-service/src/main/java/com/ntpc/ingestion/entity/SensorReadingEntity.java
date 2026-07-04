package com.ntpc.ingestion.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * JPA entity mapping to the sensor_readings TimescaleDB hypertable.
 * Uses SEQUENCE strategy for batch-friendly ID generation (IDENTITY disables batching).
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

    @Column(name = "sensor_id", nullable = false, length = 64)
    private String sensorId;

    @Column(name = "unit", nullable = false, length = 16)
    private String unit;

    @Column(name = "sensor_type", nullable = false, length = 32)
    private String sensorType;

    @Column(name = "value", nullable = false)
    private Double value;

    @Column(name = "unit_of_measure", nullable = false, length = 16)
    private String unitOfMeasure;

    @Column(name = "reading_time", nullable = false)
    private Instant readingTime;
}
