package com.sttl.workflow.runtime.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowRuntimeResponseDto {
    private boolean success;
    private Long workflowInstanceId;
    private Long taskId;
    private String recordId;
    private String status;
    private String currentNodeId;
    private String message;
}
