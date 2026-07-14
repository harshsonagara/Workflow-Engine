package com.sttl.workflow.runtime.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExecuteActionDto {
    private Long taskId;
    private String recordId;
    private String action;
    private String remarks;

    // Optional third-party caller context — used when headers/JWT don't supply these values.
    // Header/JWT always takes precedence when present.
    private String performedBy;
    private String performedByName;
    private String role;
}
