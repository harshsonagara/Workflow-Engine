package com.sttl.workflow.definition.dto.version;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActiveVersionSummaryDto {
    private Long id;
    private String versionName;
    private boolean isActive;
    private OffsetDateTime createdAt;
}
