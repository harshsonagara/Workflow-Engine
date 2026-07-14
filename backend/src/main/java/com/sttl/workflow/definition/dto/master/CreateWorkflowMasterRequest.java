package com.sttl.workflow.definition.dto.master;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Request DTO for creating a new workflow master. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWorkflowMasterRequest {

    @NotBlank(message = "Workflow name is required")
    private String workflowName;

    private String tenantId;

    @NotBlank(message = "Version name is required")
    private String versionName;

    @Builder.Default
    private boolean active = true;

    @NotBlank(message = "Definition JSON is required")
    private String definitionJson;
}
