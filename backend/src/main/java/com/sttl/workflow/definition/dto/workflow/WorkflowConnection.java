package com.sttl.workflow.definition.dto.workflow;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowConnection {

    @JsonProperty("from")
    private String from;

    @JsonProperty("to")
    private String to;

    @JsonProperty("onAction")
    private String onAction;

    @JsonProperty("on")
    private String on;

    @JsonProperty("notification")
    private String notification;

    @JsonProperty("api_call_on_action")
    private String apiCallOnAction;
}
