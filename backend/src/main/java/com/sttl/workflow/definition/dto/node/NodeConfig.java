package com.sttl.workflow.definition.dto.node;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sttl.workflow.definition.dto.sla.SlaConfig;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NodeConfig {

    @JsonProperty("allowedInitiators")
    private AllowedInitiators allowedInitiators;

    @JsonProperty("label")
    private String label;

    @JsonProperty("approvalMode")
    private String approvalMode;

    @JsonProperty("assignee")
    private Assignee assignee;

    @JsonProperty("assignees")
    private List<Assignee> assignees;

    @JsonProperty("actions")
    private List<ActionDefinitionDto> actions;

    @JsonProperty("sla")
    private SlaConfig sla;

    @JsonProperty("finalStatus")
    private String finalStatus;

    @JsonProperty("defaultStatus")
    private String defaultStatus;

    @JsonProperty("connectionStatuses")
    private Map<String, Map<String, String>> connectionStatuses;

    @JsonProperty("workflowDefinitionId")
    private Long workflowDefinitionId;

    @JsonProperty("workflowVersionId")
    private Long workflowVersionId;

    @JsonProperty("successAction")
    private String successAction;

    @JsonProperty("failureAction")
    private String failureAction;

    @JsonProperty("rules")
    private List<ConditionalRule> rules;

    @JsonProperty("defaultAction")
    private String defaultAction;

    @JsonProperty("requireRemarksOnReject")
    private Boolean requireRemarksOnReject;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AllowedInitiators {
        @JsonProperty("type")
        private String type;

        @JsonProperty("values")
        @Builder.Default
        private List<String> values = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Assignee {
        @JsonProperty("type")
        private String type;

        @JsonProperty("value")
        private String value;
    }
}
