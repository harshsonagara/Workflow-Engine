package com.sttl.workflow.runtime.entity;

import com.sttl.workflow.common.entity.BaseAuditEntity;
import com.sttl.workflow.version.entity.WorkflowVersion;
import com.sttl.workflow.task.entity.WorkflowTask;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(
    name = "instance",
    schema = "workflow",
    indexes = {
        @Index(name = "idx_instance_status", columnList = "status"),
        @Index(name = "idx_instance_entity", columnList = "entity_type, entity_id"),
        @Index(name = "idx_instance_business_key", columnList = "business_key")
    }
)
@Data
@EqualsAndHashCode(callSuper = false)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowInstance extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "entity_type", length = 100)
    private String entityType;

    @Column(name = "entity_id", length = 100)
    private String entityId;

    @Column(name = "business_key", length = 100)
    private String businessKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "variables", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> variables = new HashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @Column(name = "current_node_id", nullable = false, length = 100)
    private String currentNodeId;

    @Column(name = "status", nullable = false, length = 255)
    @Builder.Default
    private String status = "running";

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "outcome", length = 50)
    private String outcome;

    @Column(name = "parent_workflow_instance_id", insertable = false, updatable = false)
    private Long parentWorkflowInstanceId;

    @Column(name = "parent_node_id", length = 100)
    private String parentNodeId;

    @Column(name = "tenant_id", length = 100)
    private String tenantId;

    @Column(name = "paused_at")
    private OffsetDateTime pausedAt;

    @Column(name = "paused_by", length = 100)
    private String pausedBy;

    @Column(name = "paused_reason", columnDefinition = "text")
    private String pausedReason;

    @Column(name = "suspension_reason", columnDefinition = "text")
    private String suspensionReason;

    @Column(name = "reopened_count", nullable = false)
    @Builder.Default
    private Integer reopenedCount = 0;

    @Column(name = "original_status", length = 255)
    private String originalStatus;

    @Column(name = "original_node_id", length = 100)
    private String originalNodeId;

    @Column(name = "workflow_version_id", insertable = false, updatable = false)
    private Long workflowVersionId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "definition_snapshot", columnDefinition = "jsonb")
    private String definitionSnapshot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_version_id")
    @JsonIgnore
    @ToString.Exclude
    private WorkflowVersion workflowVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_workflow_instance_id")
    @JsonIgnore
    @ToString.Exclude
    private WorkflowInstance parentWorkflowInstance;

    @OneToMany(mappedBy = "parentWorkflowInstance", cascade = CascadeType.ALL)
    @Builder.Default
    @JsonIgnore
    @ToString.Exclude
    private List<WorkflowInstance> childWorkflowInstances = new ArrayList<>();

    @OneToMany(mappedBy = "workflowInstance", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    private List<WorkflowTask> workflowTasks = new ArrayList<>();

    @OneToMany(mappedBy = "workflowInstance", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    private List<WorkflowAuditLog> workflowAuditLogs = new ArrayList<>();

    @OneToMany(mappedBy = "workflowInstance", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    private List<WorkflowTransitionHistory> transitionHistory = new ArrayList<>();

    @Version
    @Column(name = "row_version")
    private Long rowVersion;
}
