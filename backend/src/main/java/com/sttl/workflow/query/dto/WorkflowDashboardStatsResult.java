package com.sttl.workflow.query.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDashboardStatsResult {
    private long completed;
    private long inProcess;
    private long submitted;
}
