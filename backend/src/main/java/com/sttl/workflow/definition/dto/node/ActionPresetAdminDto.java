package com.sttl.workflow.definition.dto.node;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ActionPresetAdminDto {
    private Long id;
    private String action;
    private String label;
    private String resultStatus;
    private boolean requiresRemarks;
    private boolean remarksMandatory;
    private int sortOrder;
    private boolean active;
}
