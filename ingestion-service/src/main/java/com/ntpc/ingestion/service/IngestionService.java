package com.ntpc.ingestion.service;

import com.ntpc.ingestion.dto.SensorReading;
import com.ntpc.ingestion.entity.SensorReadingEntity;
import com.ntpc.ingestion.repository.SensorReadingRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Kafka consumer that buffers incoming sensor readings and flushes them
 * to TimescaleDB in batches for optimal write throughput.
 *
 * Flush triggers:
 * 1. Buffer reaches batch-size threshold
 * 2. Scheduled flush interval expires (whichever comes first)
 */
@Slf4j
@Service
public class IngestionService {

    private final SensorReadingRepository repository;
    private final ConcurrentLinkedQueue<SensorReadingEntity> buffer = new ConcurrentLinkedQueue<>();
    private final Counter ingestedCounter;
    private final Counter errorCounter;
    private final Timer flushTimer;

    @Value("${ingestion.batch-size}")
    private int batchSize;

    public IngestionService(SensorReadingRepository repository, MeterRegistry meterRegistry) {
        this.repository = repository;
        this.ingestedCounter = Counter.builder("ingestion.readings.persisted")
                .description("Total sensor readings persisted to TimescaleDB")
                .register(meterRegistry);
        this.errorCounter = Counter.builder("ingestion.readings.errors")
                .description("Total sensor readings that failed to parse or persist")
                .register(meterRegistry);
        this.flushTimer = Timer.builder("ingestion.flush.duration")
                .description("Time taken to flush a batch to TimescaleDB")
                .register(meterRegistry);
    }

    /**
     * Kafka listener consuming from sensor-readings topic.
     * Buffers each reading and triggers a flush when batch size is reached.
     */
    @KafkaListener(topics = "${ingestion.topic}", groupId = "ingestion-group")
    public void consume(SensorReading reading) {
        try {
            SensorReadingEntity entity = mapToEntity(reading);
            buffer.add(entity);

            log.debug("[BUFFER] sensorId={} unit={} bufferSize={}", reading.getSensorId(), reading.getUnit(), buffer.size());

            // Flush if buffer exceeds batch size
            if (buffer.size() >= batchSize) {
                flush();
            }
        } catch (Exception e) {
            errorCounter.increment();
            log.error("[INGEST ERROR] Failed to process reading: sensorId={} error={}",
                    reading != null ? reading.getSensorId() : "null", e.getMessage(), e);
        }
    }

    /**
     * Scheduled flush — ensures data is persisted even when message rate is low.
     */
    @Scheduled(fixedDelayString = "${ingestion.flush-interval-ms}")
    public void scheduledFlush() {
        if (!buffer.isEmpty()) {
            flush();
        }
    }

    /**
     * Drain the buffer and persist all readings in a single batch insert.
     */
    private synchronized void flush() {
        if (buffer.isEmpty()) return;

        List<SensorReadingEntity> batch = new ArrayList<>();
        SensorReadingEntity entity;
        while ((entity = buffer.poll()) != null) {
            batch.add(entity);
        }

        if (batch.isEmpty()) return;

        flushTimer.record(() -> {
            try {
                repository.saveAll(batch);
                ingestedCounter.increment(batch.size());
                log.info("[INGEST] Flushed {} readings to TimescaleDB", batch.size());
            } catch (Exception e) {
                errorCounter.increment(batch.size());
                log.error("[INGEST ERROR] Failed to flush batch of {} readings: {}",
                        batch.size(), e.getMessage(), e);
                // Re-add to buffer for retry on next flush
                buffer.addAll(batch);
            }
        });
    }

    /**
     * Ensure remaining buffered readings are flushed on shutdown.
     */
    @PreDestroy
    public void onShutdown() {
        log.info("[SHUTDOWN] Flushing remaining {} buffered readings...", buffer.size());
        flush();
    }

    private SensorReadingEntity mapToEntity(SensorReading reading) {
        return SensorReadingEntity.builder()
                .sensorId(reading.getSensorId())
                .unit(reading.getUnit())
                .sensorType(reading.getSensorType())
                .value(reading.getValue())
                .unitOfMeasure(reading.getUnitOfMeasure())
                .readingTime(reading.getTimestamp())
                .build();
    }
}
