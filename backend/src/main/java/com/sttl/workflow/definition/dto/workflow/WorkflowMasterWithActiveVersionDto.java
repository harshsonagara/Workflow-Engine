package com.sttl.workflow.definition.dto.workflow;

import com.sttl.workflow.definition.dto.version.ActiveVersionSummaryDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowMasterWithActiveVersionDto {
    private Long id;
    private String workflowName;
    private String code;
    private boolean isActive;
    private OffsetDateTime createdAt;
    private ActiveVersionSummaryDto activeVersion;
}
