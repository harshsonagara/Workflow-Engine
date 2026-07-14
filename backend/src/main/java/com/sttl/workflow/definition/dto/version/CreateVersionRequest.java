package com.sttl.workflow.definition.dto.version;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateVersionRequest {
    @NotBlank(message = "Workflow name is required")
    private String workflowName;

    @NotBlank(message = "Version name is required")
    private String versionName;

    private boolean active;

    @NotBlank(message = "Definition JSON is required")
    private String definitionJson;
}
