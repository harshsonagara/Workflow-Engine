package com.sttl.workflow.definition.entity;

import com.sttl.workflow.version.entity.WorkflowVersion;

import com.sttl.workflow.common.entity.BaseAuditEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Top-level container for all versions of a workflow definition.
 * External systems reference workflows by {@code code}, not {@code id} — only one version
 * may be active at a time for runtime execution.
 */
@Entity
@Table(
        name = "master",
        schema = "workflow",
        indexes = {
                @Index(name = "ix_workflow_master_name", columnList = "workflow_name"),
                @Index(name = "ix_workflow_master_code", columnList = "code"),
                @Index(name = "ix_workflow_master_tenant", columnList = "tenant_id")
        },
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "ux_master_code_tenant",
                        columnNames = {"code", "tenant_id"}
                )
        }
)
@Data
@EqualsAndHashCode(callSuper = false)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowMaster extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "workflow_name", nullable = false, length = 200)
    private String workflowName;

    /** Stable external reference; format: UPPER_SNAKE_CASE. Auto-generated from workflowName if omitted. */
    @Column(name = "code", length = 100)
    private String code;

    @Column(name = "tenant_id", length = 100)
    private String tenantId;

    /** When false, hides from UI and blocks new instances; does not affect in-flight instances. */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    /** Soft-delete only — hard deletion never occurs to preserve compliance audit trail. */
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /** Only one version may have isActive=true at a time. New versions start in draft (isActive=false). */
    @OneToMany(mappedBy = "workflowMaster", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    private List<WorkflowVersion> workflowVersions = new ArrayList<>();
}
