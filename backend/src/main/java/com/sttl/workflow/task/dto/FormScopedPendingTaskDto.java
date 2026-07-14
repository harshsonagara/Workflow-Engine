package com.sttl.workflow.task.dto;

import com.sttl.workflow.monitoring.dto.SlaStatusDto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormScopedPendingTaskDto {
    private Long taskId;
    private Long instanceId;
    private String recordId;
    private String workflowName;
    private OffsetDateTime createdAt;
    private String nodeLabel;
    private SlaStatusDto slaStatus;
    private Boolean allowEdit;
}
