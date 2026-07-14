package com.sttl.workflow.version.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sttl.workflow.common.entity.BaseAuditEntity;
import com.sttl.workflow.definition.entity.WorkflowMaster;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.OffsetDateTime;

/**
 * Immutable snapshot of a workflow definition. Like a Git commit — the JSON never changes
 * after creation; any edit requires a new version.
 * <p>
 * Lifecycle:
 * <ol>
 *   <li>Created as draft ({@code isActive=false}) — editable and deleteable</li>
 *   <li>Activated ({@code isActive=true}) — at most ONE active version per master at any time</li>
 *   <li>Activating deactivates all siblings; running instances keep their original version</li>
 *   <li>Deleted versions are soft-deleted only — never hard-deleted (audit/compliance)</li>
 * </ol>
 *
 * @see WorkflowMaster
 * @see com.sttl.workflow.version.repository.WorkflowVersionRepository
 */
@Entity
@Table(
    name = "version",
    schema = "workflow",
    uniqueConstraints = {
        @UniqueConstraint(name = "ux_workflow_versions_unique", columnNames = {"workflow_master_id", "version_name"})
    }
)
@Data
@EqualsAndHashCode(callSuper = false)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowVersion extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    // Read-only FK projection — the JPA relationship is on workflowMaster below.
    @Column(name = "workflow_master_id", nullable = false, insertable = false, updatable = false)
    private Long workflowMasterId;

    @Column(name = "version_name", nullable = false, length = 200)
    private String versionName;

    /**
     * Full workflow structure as JSONB (nodes, connections, SLA rules, assignees).
     * Validated on creation via WorkflowValidationService.
     * Cached after first parse via WorkflowDefinitionParser — never re-parsed per instance.
     * Immutable: never modified after creation. Changes require a new version.
     */
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "definition_json", nullable = false, columnDefinition = "jsonb")
    private String definitionJson;

    /**
     * When true, new workflow instances use this version.
     * Exactly one version per master may be active at a time;
     */
    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean isActive = false;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "created_by")
    private Integer createdBy;

    @Column(name = "updated_by")
    private Integer updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    // @JsonIgnore + @ToString.Exclude prevent serialization cycles with WorkflowMaster.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_master_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    private WorkflowMaster workflowMaster;
}
