package com.sttl.workflow.security.entity;

import com.sttl.workflow.common.entity.BaseAuditEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * Local user account for the workflow portal.
 * Auth is wired but not enforced — accounts exist so login/signup work
 * and JWTs carry real identity; endpoints stay open until enforcement is on.
 */
@Entity
@Table(
    name = "app_user",
    schema = "workflow",
    uniqueConstraints = @UniqueConstraint(name = "ux_app_user_email", columnNames = "email")
)
@Data
@EqualsAndHashCode(callSuper = false)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppUser extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, length = 200)
    private String email;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    /** BCrypt hash — never the raw password. */
    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    /** Simple role code carried into the JWT ("admin", "user", ...). */
    @Column(name = "role", nullable = false, length = 50)
    @Builder.Default
    private String role = "user";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;
}
