package com.sttl.workflow.task.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import com.sttl.workflow.task.entity.WorkflowTask;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WorkflowTaskDto {
    private Long id;
    private Long workflowInstanceId;
    private String recordId;
    private String nodeId;
    private String assignedTo;
    private String assignedRole;
    private String status;
    private String remarks;
    private OffsetDateTime createdAt;
    private OffsetDateTime actedAt;
    private Boolean actionTaken;
    private OffsetDateTime slaDeadline;
    private Boolean slaBreached;
    private OffsetDateTime slaBreachedAt;
    private String slaEscalationType;
    private Boolean escalated;
    private Boolean allowEdit;

    public static WorkflowTaskDto from(WorkflowTask entity) {
        return WorkflowTaskDto.builder()
                .id(entity.getId())
                .workflowInstanceId(entity.getWorkflowInstanceId())
                .recordId(entity.getWorkflowInstance() != null ? entity.getWorkflowInstance().getBusinessKey() : null)
                .nodeId(entity.getNodeId())
                .assignedTo(entity.getResolvedAssignedTo())
                .assignedRole(entity.getResolvedAssignedRole())
                .status(entity.getStatus())
                .remarks(entity.getRemarks())
                .createdAt(entity.getCreatedAt())
                .actedAt(entity.getActedAt())
                .actionTaken(entity.getActionTaken())
                .slaDeadline(entity.getSlaDeadline())
                .slaBreached(entity.isSlaBreached() ? true : null)
                .slaBreachedAt(entity.getSlaBreachedAt())
                .slaEscalationType(entity.getSlaEscalationType())
                .escalated(entity.isEscalated() ? true : null)
                .allowEdit(entity.getAllowEdit())
                .build();
    }
}
