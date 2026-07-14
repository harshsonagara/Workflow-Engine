package com.sttl.workflow.task.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sttl.workflow.common.entity.BaseAuditEntity;
import com.sttl.workflow.runtime.entity.WorkflowInstance;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Entity mapping to the 'workflow_tasks' database table under the 'workflow_engine' schema.
 */
@Entity
@Table(
    name = "task",
    schema = "workflow",
    indexes = {
        @Index(name = "idx_tasks_instance", columnList = "workflow_instance_id"),
        @Index(name = "idx_tasks_resolved_assigned_to", columnList = "resolved_assigned_to"),
        @Index(name = "idx_tasks_status", columnList = "status"),
        @Index(name = "idx_tasks_assignment_type", columnList = "assignment_type")
    }
)
@Data
@EqualsAndHashCode(callSuper = false)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowTask extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "workflow_instance_id", nullable = false, insertable = false, updatable = false)
    private Long workflowInstanceId;

    @Column(name = "node_id", nullable = false, length = 100)
    private String nodeId;

    /** Assignment strategy: USER, ROLE, RULE, DEPARTMENT, API */
    @Column(name = "assignment_type", length = 50)
    private String assignmentType;

    /** Raw config value from the workflow node definition */
    @Column(name = "assignment_value", length = 255)
    private String assignmentValue;

    /** Actual user resolved at task creation — preserved for audit trail */
    @Column(name = "resolved_assigned_to", length = 100)
    private String resolvedAssignedTo;

    /** Actual role resolved at task creation — preserved for audit trail */
    @Column(name = "resolved_assigned_role", length = 100)
    private String resolvedAssignedRole;

    @Column(name = "status", nullable = false, length = 250)
    @Builder.Default
    private String status = "pending";

    @Column(name = "remarks", columnDefinition = "text")
    private String remarks;

    /** Display data for task inbox rendering */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @Column(name = "acted_at")
    private OffsetDateTime actedAt;

    @Column(name = "action_taken")
    @Builder.Default
    private Boolean actionTaken = false;

    @Column(name = "sla_deadline")
    private OffsetDateTime slaDeadline;

    @Column(name = "sla_breached", nullable = false)
    @Builder.Default
    private boolean slaBreached = false;

    @Column(name = "sla_breached_at")
    private OffsetDateTime slaBreachedAt;

    @Column(name = "sla_escalation_type", length = 50)
    private String slaEscalationType;

    @Column(name = "is_escalated", nullable = false)
    @Builder.Default
    private boolean isEscalated = false;

    @Column(name = "allow_edit")
    @Builder.Default
    private Boolean allowEdit = false;

    /** User who claimed the task (took ownership) */
    @Column(name = "claimed_by", length = 100)
    private String claimedBy;

    @Column(name = "claimed_at")
    private OffsetDateTime claimedAt;

    /** User who completed the task */
    @Column(name = "completed_by", length = 100)
    private String completedBy;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    /** When task was initially assigned */
    @Column(name = "assigned_at")
    private OffsetDateTime assignedAt;

    @Column(name = "tenant_id", length = 100)
    private String tenantId;

    @Version
    @Column(name = "row_version")
    private Long rowVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_instance_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    private WorkflowInstance workflowInstance;
}
