package com.sttl.workflow.query.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApplicationHistoryDto {
    private String title;           // what happened: "Task Approved", "Workflow Started"
    private String step;            // which step: "Initial Review", "Department Investigation"
    private String action;          // what user chose: "Approve", "Reject" (null for system events)
    private String by;              // display name of who acted ("Jay"), falls back to ID then "System"
    private String actorId;         // raw user ID for linking back to caller's user system ("raj")
    private String role;            // role that performed the action (e.g. MANAGER)
    private String fromNode;        // source node label of the transition
    private String toNode;          // target node label of the transition
    private Long durationSeconds;   // seconds the task sat before action was taken (user events only)
    private OffsetDateTime slaDeadline;   // deadline set when task was created
    private OffsetDateTime slaBreachedAt; // when SLA was breached (sla_breached events only)
    private String escalatedTo;           // role/user escalated to (sla_escalated_to_role events only)
    private String remarks;
    private OffsetDateTime date;
    private String status;
}
