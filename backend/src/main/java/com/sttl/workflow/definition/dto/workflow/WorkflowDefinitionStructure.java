package com.sttl.workflow.definition.dto.workflow;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Data Transfer Object representing the complete structure of a workflow definition.
 *
 * This DTO is the primary structure serialized to JSON and stored in WorkflowVersion.definitionJson.
 * It describes the workflow's topology: all nodes, connections between them, and routing logic.
 *
 * **Typical Workflow Structure:**
 * 1. Single START node (entry point for all instances)
 * 2. APPROVAL nodes (human tasks with decision-making)
 * 3. DECISION nodes (automated routing based on context data)
 * 4. End nodes (terminate instance with final status)
 *
 * **Validation:**
 * Validated via WorkflowValidationService:
 * - All nodes in connections must exist in nodes list
 * - Exactly one START node, at least one END node
 * - No orphaned nodes (unreachable from START)
 *
 * @see WorkflowNode
 * @see WorkflowConnection
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDefinitionStructure {

    @JsonProperty("workflowId")
    private String workflowId;

    @JsonProperty("version")
    private int version;

    @JsonProperty("isActive")
    private boolean isActive;

    @JsonProperty("nodes")
    @Builder.Default
    private List<WorkflowNode> nodes = new ArrayList<>();

    @JsonProperty("connections")
    @Builder.Default
    private List<WorkflowConnection> connections = new ArrayList<>();
}
