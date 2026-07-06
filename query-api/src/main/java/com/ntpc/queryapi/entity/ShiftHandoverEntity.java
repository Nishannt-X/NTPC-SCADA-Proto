package com.ntpc.queryapi.entity;
import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "shift_handovers")
@Data
public class ShiftHandoverEntity {
    @Id @Column(name = "handover_id") private UUID handoverId;
    @Column(name = "shift_number") private Integer shiftNumber;
    @Column(name = "shift_start", nullable = false) private Instant shiftStart;
    @Column(name = "shift_end", nullable = false) private Instant shiftEnd;
    @Column(name = "operator_outgoing", nullable = false) private String operatorOutgoing;
    @Column(name = "operator_incoming", nullable = false) private String operatorIncoming;
    @Column(name = "unit1_load_mw") private Double unit1LoadMw;
    @Column(name = "unit2_load_mw") private Double unit2LoadMw;
    @Column(name = "plant_total_load_mw") private Double plantTotalLoadMw;
    @Column(name = "active_alerts_count") private Integer activeAlertsCount;
    @Column(name = "resolved_alerts_count") private Integer resolvedAlertsCount;
    @Column(name = "critical_alerts_count") private Integer criticalAlertsCount;
    @Column(name = "incidents_summary") private String incidentsSummary;
    @Column(name = "outgoing_notes") private String outgoingNotes;
    @Column(name = "incoming_acknowledgment") private String incomingAcknowledgment;
    @Column(name = "completed_at") private Instant completedAt;
}
