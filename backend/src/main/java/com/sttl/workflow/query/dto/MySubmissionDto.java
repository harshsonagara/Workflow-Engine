package com.sttl.workflow.query.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MySubmissionDto {
    private Long instanceId;
    private String recordId;
    private String workflowName;
    private String status;
    private String currentNodeId;
    private OffsetDateTime submittedAt;
    private OffsetDateTime completedAt;
}
