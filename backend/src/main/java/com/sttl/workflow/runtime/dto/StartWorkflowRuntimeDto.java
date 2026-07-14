package com.sttl.workflow.runtime.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for starting a workflow instance.
 * processCode is the only accepted identifier — it must be registered via the
 * Process Mappings UI or API before calling /start.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StartWorkflowRuntimeDto {

    /** Process code registered via the Mappings UI or API — resolved to the active workflow version internally */
    private String processCode;

    /** Runtime context: entity reference, variables, and display metadata */
    private WorkflowContext context;

    /** User ID of the person initiating the workflow */
    private String initiatedBy;

    /** Display name of the person initiating the workflow (shown in history) */
    private String initiatedByName;
}
