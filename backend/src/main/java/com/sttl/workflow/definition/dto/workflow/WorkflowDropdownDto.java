package com.sttl.workflow.definition.dto.workflow;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDropdownDto {
    private Long id;
    private String workflowName;
    private String code;
}
