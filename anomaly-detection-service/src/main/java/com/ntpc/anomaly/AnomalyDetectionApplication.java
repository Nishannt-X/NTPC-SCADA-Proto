package com.ntpc.anomaly;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class AnomalyDetectionApplication {

    public static void main(String[] args) {
        SpringApplication.run(AnomalyDetectionApplication.class, args);
    }
}
