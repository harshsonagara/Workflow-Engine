package com.sttl.workflow.mapping.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.sttl.workflow.definition.entity.WorkflowMaster;
import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "process_mapping", schema = "workflow")
@Data
public class ProcessMapping {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "process_code", unique = true, nullable = false)
    private String processCode;

    @Column(name = "process_name", nullable = false)
    private String processName;

    @Column(name = "description", length = 500)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_master_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    private WorkflowMaster workflowMaster;

    @Column(name = "entity_type")
    private String entityType;

    @Column(name = "business_key_prefix")
    private String businessKeyPrefix;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "assignment_config", columnDefinition = "jsonb")
    private Map<String, Object> assignmentConfig;

    @Column(name = "is_active")
    private Boolean isActive = true;
}
