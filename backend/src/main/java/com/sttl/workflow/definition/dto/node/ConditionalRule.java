package com.sttl.workflow.definition.dto.node;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConditionalRule {

    @JsonProperty("conditions")
    private List<RuleCondition> conditions;

    /** Per-condition logic: "AND" / "OR" between consecutive conditions. Length = conditions.size() - 1 */
    @JsonProperty("operators")
    private List<String> operators;

    @JsonProperty("nextAction")
    private String nextAction;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RuleCondition {
        @JsonProperty("key")
        private String key;

        @JsonProperty("operator")
        private String operator;

        @JsonProperty("value")
        private Object value;

        @JsonProperty("valueType")
        private String valueType;
    }
}
