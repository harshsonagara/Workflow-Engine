package com.sttl.workflow.definition.dto.node;

import lombok.Data;

@Data
public class ActionPresetPatchDto {
    private String label;
    private String resultStatus;
    private Boolean requiresRemarks;
    private Boolean remarksMandatory;
    private Integer sortOrder;
    private Boolean active;
}
