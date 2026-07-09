package com.ntpc.ingestion.service;

import com.ntpc.ingestion.dto.SensorReading;
import com.ntpc.ingestion.dto.TelemetryEnvelope;
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

@Slf4j
@Service
public class IngestionService {

    private final SensorReadingRepository repository;
    private final ConcurrentLinkedQueue<SensorReadingEntity> buffer = new ConcurrentLinkedQueue<>();
    private final Counter ingestedCounter;
    private final Counter errorCounter;
    private final Timer flushTimer;

    @Value("${ingestion.batch-size:100}")
    private int batchSize;

    public IngestionService(SensorReadingRepository repository, MeterRegistry meterRegistry) {
        this.repository = repository;
        this.ingestedCounter = Counter.builder("ingestion.readings.persisted")
                .register(meterRegistry);
        this.errorCounter = Counter.builder("ingestion.readings.errors")
                .register(meterRegistry);
        this.flushTimer = Timer.builder("ingestion.flush.duration")
                .register(meterRegistry);
    }

    @KafkaListener(topicPattern = "telemetry\\..*", groupId = "ingestion-group")
    public void consume(TelemetryEnvelope envelope) {
        try {
            if (envelope == null || envelope.getReadings() == null) return;
            
            for (SensorReading reading : envelope.getReadings()) {
                SensorReadingEntity entity = mapToEntity(reading);
                buffer.add(entity);
            }

            if (buffer.size() >= batchSize) {
                flush();
            }
        } catch (Exception e) {
            errorCounter.increment();
            log.error("[INGEST ERROR] Failed to process envelope: {}", e.getMessage(), e);
        }
    }

    @Scheduled(fixedDelayString = "${ingestion.flush-interval-ms:5000}")
    public void scheduledFlush() {
        if (!buffer.isEmpty()) {
            flush();
        }
    }

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
                log.error("[INGEST ERROR] Failed to flush batch: {}", e.getMessage(), e);
                buffer.addAll(batch);
            }
        });
    }

    @PreDestroy
    public void onShutdown() {
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
