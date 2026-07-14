package com.sttl.workflow.mapping.dto;

import lombok.Data;
import java.util.Map;

@Data
public class ProcessDto {
    private Long id;
    private String processCode;
    private String processName;
    private String description;
    private Long workflowMasterId;
    private String entityType;
    private String businessKeyPrefix;
    private Map<String, Object> assignmentConfig;
    private Boolean isActive;
}
