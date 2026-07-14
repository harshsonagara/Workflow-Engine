package com.sttl.workflow.definition.dto.sla;

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
public class SlaConfig {

    @JsonProperty("duration")
    private int duration;

    @JsonProperty("unit")
    private String unit; // "minutes", "hours", "days"

    @JsonProperty("escalationType")
    private String escalationType; // "escalate_to_role", "move_to_next_node", "keep_with_warning"

    @JsonProperty("escalation")
    private SlaEscalation escalation;

    @JsonProperty("requiresInitiatorNotification")
    @Builder.Default
    private Boolean requiresInitiatorNotification = false;

    @JsonProperty("initiatorEmailTemplate")
    private String initiatorEmailTemplate;

    @JsonProperty("initiatorEmailCC")
    @Builder.Default
    private List<String> initiatorEmailCC = new ArrayList<>();

    @JsonProperty("initiatorSMSTextTemplate")
    private String initiatorSMSTextTemplate;

    @JsonProperty("initiatorSystemNotificationTemplate")
    private String initiatorSystemNotificationTemplate;

    @JsonProperty("requiresFollowUpNotification")
    @Builder.Default
    private Boolean requiresFollowUpNotification = false;

    @JsonProperty("followUpEmailTemplate")
    private String followUpEmailTemplate;

    @JsonProperty("followUpEmailCC")
    @Builder.Default
    private List<String> followUpEmailCC = new ArrayList<>();

    @JsonProperty("followUpSMSTextTemplate")
    private String followUpSMSTextTemplate;

    @JsonProperty("followUpSystemNotificationTemplate")
    private String followUpSystemNotificationTemplate;

    @JsonProperty("autoProgressAction")
    private String autoProgressAction;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlaEscalation {
        @JsonProperty("type")
        private String type; // "role" or "user"

        @JsonProperty("value")
        private String value; // role ID or user ID
    }
}
