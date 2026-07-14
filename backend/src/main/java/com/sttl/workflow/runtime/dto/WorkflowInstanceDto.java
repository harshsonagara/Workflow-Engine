package com.sttl.workflow.runtime.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.sttl.workflow.task.dto.WorkflowTaskDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WorkflowInstanceDto {
    private Long id;
    private String recordId;
    private String currentNodeId;
    private String status;
    private String createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime completedAt;

    private Long parentWorkflowInstanceId;
    private String parentNodeId;
    private String outcome;
    private Long workflowVersionId;
    private List<WorkflowTaskDto> workflowTasks;
}