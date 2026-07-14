package com.sttl.workflow.runtime.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Entity mapping to the 'workflow_transition_history' database table.
 * Tracks every stage transition in a workflow instance for full audit trail.
 */
@Entity
@Table(
    name = "transition_history",
    schema = "workflow",
    indexes = {
        @Index(name = "idx_transition_instance", columnList = "workflow_instance_id"),
        @Index(name = "idx_transition_time", columnList = "transition_time")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowTransitionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "workflow_instance_id", nullable = false, insertable = false, updatable = false)
    private Long workflowInstanceId;

    @Column(name = "from_node_id", length = 100)
    private String fromNodeId;

    @Column(name = "to_node_id", nullable = false, length = 100)
    private String toNodeId;

    /** Transition type: auto, user, system, escalation, delegation, reopen */
    @Column(name = "transition_type", nullable = false, length = 50)
    @Builder.Default
    private String transitionType = "auto";

    @Column(name = "transition_time", nullable = false)
    @CreationTimestamp
    private OffsetDateTime transitionTime;

    @Column(name = "performed_by", length = 100)
    private String performedBy;

    @Column(name = "reason", columnDefinition = "text")
    private String reason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @Column(name = "tenant_id", length = 100)
    private String tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_instance_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    private WorkflowInstance workflowInstance;
}
