package com.ntpc.simulator.model;

import lombok.Data;

/**
 * Mutable runtime state for a single virtual sensor.
 * Tracks current value and active fault injection parameters.
 */
@Data
public class SensorState {

    private double currentValue;
    private int faultCyclesRemaining;
    private double faultMultiplier;  // e.g. 1.15 for MODERATE (+15%), 1.25 for SEVERE (+25%)

    public SensorState(double initialValue) {
        this.currentValue = initialValue;
        this.faultCyclesRemaining = 0;
        this.faultMultiplier = 1.0;
    }

    public boolean isFaultActive() {
        return faultCyclesRemaining > 0;
    }

    public void decrementFaultCycle() {
        if (faultCyclesRemaining > 0) {
            faultCyclesRemaining--;
            if (faultCyclesRemaining == 0) {
                faultMultiplier = 1.0;
            }
        }
    }
}
