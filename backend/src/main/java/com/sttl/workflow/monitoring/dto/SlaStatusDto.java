package com.sttl.workflow.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlaStatusDto {
    private OffsetDateTime deadline;
    private boolean isBreached;
    private OffsetDateTime breachedAt;
    private String breachedDuration;
    private String escalationType;
    private boolean isEscalated;
    private String warningMessage;
    @Builder.Default
    private boolean canTakeAction = true;
    private String originalAssignee;
}
