package com.ntpc.queryapi.service;

import com.ntpc.queryapi.dto.SensorReadingResponse;
import com.ntpc.queryapi.entity.SensorReadingEntity;
import com.ntpc.queryapi.repository.SensorReadingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReadingQueryService {

    private final SensorReadingRepository readingRepository;

    /**
     * Get the latest reading for each sensor in the given unit.
     * Cached in Redis with configurable TTL (Phase 4).
     */
    @Cacheable(value = "latestReadings", key = "#unitId")
    public List<SensorReadingResponse> getLatestReadings(String unitId) {
        log.info("[QUERY] Fetching latest readings for unit={} (cache miss)", unitId);
        List<SensorReadingEntity> entities = readingRepository.findLatestByUnit(unitId);
        return entities.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get historical readings with time range and optional sensor type filter.
     */
    public Page<SensorReadingResponse> getHistoricalReadings(
            String unitId, Instant from, Instant to,
            String sensorType, int page, int size) {
        log.info("[QUERY] Historical readings for unit={} from={} to={} type={} page={} size={}",
                unitId, from, to, sensorType, page, size);
        Page<SensorReadingEntity> entities = readingRepository.findByUnitAndTimeRange(
                unitId, from, to, sensorType, PageRequest.of(page, size));
        return entities.map(this::mapToResponse);
    }

    private SensorReadingResponse mapToResponse(SensorReadingEntity entity) {
        return SensorReadingResponse.builder()
                .sensorId(entity.getSensorId())
                .unit(entity.getUnit())
                .sensorType(entity.getSensorType())
                .value(entity.getValue())
                .unitOfMeasure(entity.getUnitOfMeasure())
                .timestamp(entity.getReadingTime())
                .build();
    }
}
