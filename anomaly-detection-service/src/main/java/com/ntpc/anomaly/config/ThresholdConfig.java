package com.ntpc.anomaly.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/**
 * Binds threshold configuration from application.yml.
 * Maps sensor type → {warning, critical} threshold pair.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "")
public class ThresholdConfig {

    private Map<String, ThresholdPair> thresholds;

    @Data
    public static class ThresholdPair {
        private double warning;
        private double critical;
    }
}
