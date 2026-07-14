package com.sttl.workflow.query.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConditionalKeysResponseDto {
    private String workflowName;
    private int version;
    @Builder.Default
    private List<ConditionalNodeKeysDto> conditionalNodes = new ArrayList<>();
    @Builder.Default
    private List<String> allUniqueKeys = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConditionalNodeKeysDto {
        private String nodeId;
        private String label;
        @Builder.Default
        private List<ConditionalKeyDto> keys = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConditionalKeyDto {
        private String key;
        private String operator;
        private String value;
        private String nextAction;
    }
}
