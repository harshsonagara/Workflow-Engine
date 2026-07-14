package com.sttl.workflow.definition.dto.node;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ActionDefinitionDto {

    @JsonProperty("action")
    @JsonAlias({"action", "id"})
    private String action;

    @JsonProperty("label")
    private String label;

    @JsonProperty("resultStatus")
    private String resultStatus;

    @JsonProperty("requiresRemarks")
    private boolean requiresRemarks;

    @JsonProperty("remarksMandatory")
    private boolean remarksMandatory;

    @JsonProperty("predefinedReasons")
    @Builder.Default
    private List<String> predefinedReasons = new ArrayList<>();

    // Notification / external-API fields — not yet implemented, omitted when null
    private Boolean requiresInitiatorNotification;
    private String initiatorEmailTemplate;
    private List<String> initiatorEmailCC;
    private String initiatorSMSTextTemplate;
    private String initiatorSystemNotificationTemplate;
    private Boolean requiresFollowUpNotification;
    private String followUpEmailTemplate;
    private List<String> followUpEmailCC;
    private String followUpSMSTextTemplate;
    private String followUpSystemNotificationTemplate;
    private String externalAPICall;
    private String externalAPICallBaseUrl;
    private String externalAPICallPath;
}
