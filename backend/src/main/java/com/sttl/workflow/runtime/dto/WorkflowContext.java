package com.sttl.workflow.runtime.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

/**
 * Standard context object passed by external applications when starting a workflow.

 * Applications communicate with the workflow engine exclusively through this object.
 * The engine does not need to know anything about forms, modules, or application internals.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowContext {

    /**
     * The application or module initiating this workflow.
     */
    private String application;

    /**
     * The type of business entity being processed.
     */
    private String entityType;

    /**
     * The primary key of the entity in the owning application.
     */
    private String entityId;

    /**
     * Human-readable business reference.
     */
    private String businessKey;

    /**
     * Runtime routing data — snapshot taken at workflow start.
     * Used for conditional routing, assignment rules, and escalation evaluation.
     */
    @Builder.Default
    private Map<String, Object> variables = new HashMap<>();

    /**
     * Display and search data for task lists, dashboards, and audit views.
     * Never used for routing logic.
     */
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    /** Convenience method to add a routing variable. */
    public WorkflowContext variable(String key, Object value) {
        this.variables.put(key, value);
        return this;
    }

    /** Convenience method to add a display metadata field. */
    public WorkflowContext meta(String key, Object value) {
        this.metadata.put(key, value);
        return this;
    }
}
