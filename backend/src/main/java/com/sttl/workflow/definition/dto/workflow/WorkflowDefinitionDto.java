package com.sttl.workflow.definition.dto.workflow;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDefinitionDto {
    private Long id;
    private String workflowName;
    private String versionName;
    private boolean isActive;
    private String definitionJson;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
