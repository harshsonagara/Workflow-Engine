package com.sttl.workflow.definition.dto.workflow;

import com.sttl.workflow.definition.dto.version.WorkflowVersionDto;
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
public class WorkflowMasterWithVersionsDto {
    private Long id;
    private String workflowName;
    private boolean isActive;
    private boolean isDeleted;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<WorkflowVersionDto> workflowVersions;
}
