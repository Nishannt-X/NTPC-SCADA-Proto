package com.ntpc.queryapi.service;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class CacheService {

    @Cacheable(value = "thresholds", key = "#sensorId")
    public Object getCachedThresholds(String sensorId) {
        // Fallback or integration with actual service
        return null;
    }
    
    @CacheEvict(value = "thresholds", key = "#sensorId")
    public void invalidateThresholdsCache(String sensorId) {
        // Clear cache when override is applied
    }
}
