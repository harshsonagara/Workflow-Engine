package com.sttl.workflow.definition.dto.workflow;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.sttl.workflow.definition.dto.node.NodeConfig;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowNode {

    @JsonProperty("id")
    private String id;

    @JsonProperty("type")
    private String type;

    @JsonProperty("config")
    @Builder.Default
    private NodeConfig config = new NodeConfig();
}
