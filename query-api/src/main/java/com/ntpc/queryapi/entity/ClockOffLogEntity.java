package com.ntpc.queryapi.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "clock_off_logs")
public class ClockOffLogEntity {

    @Id
    private UUID id;
    private String username;
    private Instant clockOffTime;
    private int shiftNumber;
    private boolean isEarly;
    private String notes;
    private String earlyReason;

    public ClockOffLogEntity() {
    }

    public ClockOffLogEntity(UUID id, String username, Instant clockOffTime, int shiftNumber, boolean isEarly, String notes, String earlyReason) {
        this.id = id;
        this.username = username;
        this.clockOffTime = clockOffTime;
        this.shiftNumber = shiftNumber;
        this.isEarly = isEarly;
        this.notes = notes;
        this.earlyReason = earlyReason;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public Instant getClockOffTime() {
        return clockOffTime;
    }

    public void setClockOffTime(Instant clockOffTime) {
        this.clockOffTime = clockOffTime;
    }

    public int getShiftNumber() {
        return shiftNumber;
    }

    public void setShiftNumber(int shiftNumber) {
        this.shiftNumber = shiftNumber;
    }

    public boolean getIsEarly() {
        return isEarly;
    }

    public void setIsEarly(boolean isEarly) {
        this.isEarly = isEarly;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getEarlyReason() {
        return earlyReason;
    }

    public void setEarlyReason(String earlyReason) {
        this.earlyReason = earlyReason;
    }
}
