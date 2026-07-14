package com.sttl.workflow.runtime.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sttl.workflow.common.entity.BaseAuditEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.HashMap;
import java.util.Map;

/**
 * Entity mapping to the 'workflow_audit_logs' database table under the 'workflow_engine' schema.
 */
@Entity
@Table(
    name = "audit_log",
    schema = "workflow",
    indexes = @Index(name = "idx_audit_instance", columnList = "workflow_instance_id")
)
@Data
@EqualsAndHashCode(callSuper = false)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowAuditLog extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "workflow_instance_id", insertable = false, updatable = false)
    private Long workflowInstanceId;

    @Column(name = "action", nullable = false, length = 255)
    private String action;

    @Column(name = "performed_by", length = 100)
    private String performedBy;

    @Column(name = "performed_by_name", length = 255)
    private String performedByName;

    @Column(name = "performed_by_role", length = 100)
    private String performedByRole;

    @Column(name = "node_label", length = 255)
    private String nodeLabel;

    @Column(name = "remarks", columnDefinition = "text")
    private String remarks;

    @Column(name = "event_type", length = 100)
    private String eventType;

    @Column(name = "source_node_id", length = 100)
    private String sourceNodeId;

    @Column(name = "target_node_id", length = 100)
    private String targetNodeId;

    @Column(name = "event_status", length = 50)
    private String eventStatus;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "context_data", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> contextData = new HashMap<>();

    @Column(name = "tenant_id", length = 100)
    private String tenantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_instance_id")
    @JsonIgnore
    @ToString.Exclude
    private WorkflowInstance workflowInstance;
}

