package com.sttl.workflow.mapping.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

/**
 * Stores roles and users registered by third-party applications so the
 * Workflow Designer can show live assignment dropdowns.
 *
 * Third-party apps call POST /workflow-engine-api/mappings/roles/sync to push
 * their role list once.
 */
@Entity
@Table(
    name = "role_registry",
    schema = "workflow",
    uniqueConstraints = @UniqueConstraint(
        name = "ux_role_registry_id_source",
        columnNames = {"role_id", "source"}
    ),
    indexes = {
        @Index(name = "ix_role_registry_source", columnList = "source"),
        @Index(name = "ix_role_registry_type",   columnList = "type")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleRegistry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Machine-readable identifier — used as the assignee value in workflow definitions. */
    @Column(name = "role_id", nullable = false, length = 100)
    private String roleId;

    /** Human-readable display name shown in the designer dropdown. */
    @Column(name = "label", length = 200)
    private String label;

    /** "role" or "user" */
    @Column(name = "type", nullable = false, length = 20)
    @Builder.Default
    private String type = "role";

    /** The external system that registered this entry. */
    @Column(name = "source", nullable = false, length = 100)
    @Builder.Default
    private String source = "GLOBAL";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
