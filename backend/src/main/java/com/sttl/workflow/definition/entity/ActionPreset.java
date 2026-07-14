package com.sttl.workflow.definition.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "action_preset",
    schema = "workflow",
    uniqueConstraints = @UniqueConstraint(name = "ux_action_preset_action", columnNames = "action")
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionPreset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(name = "result_status", length = 100)
    private String resultStatus;

    @Column(name = "requires_remarks", nullable = false)
    @Builder.Default
    private boolean requiresRemarks = false;

    @Column(name = "remarks_mandatory", nullable = false)
    @Builder.Default
    private boolean remarksMandatory = false;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;
}
