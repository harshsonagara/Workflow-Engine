package com.sttl.workflow.definition.dto.version;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowVersionDto {
    private Long id;
    private Long workflowMasterId;
    private String versionName;
    private String definitionJson;
    private boolean isActive;
    private boolean isDeleted;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
