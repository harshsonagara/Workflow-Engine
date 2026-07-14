package com.sttl.workflow.service.impl;

import com.sttl.workflow.definition.dto.workflow.WorkflowDefinitionStructure;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.workflow.definition.entity.WorkflowMaster;
import com.sttl.workflow.definition.repository.WorkflowMasterRepository;
import com.sttl.workflow.version.repository.WorkflowVersionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;
import com.sttl.workflow.definition.dto.node.NodeConfig.Assignee;
import com.sttl.workflow.definition.dto.node.ConditionalRule;
import com.sttl.workflow.definition.dto.node.ConditionalRule.RuleCondition;
import com.sttl.workflow.definition.dto.node.ActionDefinitionDto;
import com.sttl.workflow.definition.dto.node.NodeConfig;
import com.sttl.workflow.definition.dto.sla.SlaConfig;
import com.sttl.workflow.definition.dto.workflow.WorkflowConnection;
import com.sttl.workflow.definition.dto.workflow.WorkflowNode;
import com.sttl.workflow.definition.dto.WorkflowValidationResult;

@Service
@Slf4j
public class WorkflowValidationServiceImpl {

    private static final Set<String> VALID_NODE_TYPES = Set.of("start", "approval", "end", "sub_workflow", "conditional");
    private static final Set<String> VALID_APPROVAL_MODES = Set.of("single", "parallel_all", "parallel_any");
    private static final Set<String> VALID_SLA_UNITS = Set.of("minutes", "hours", "days");
    private static final Set<String> VALID_CONDITIONAL_OPERATORS = Set.of("=", "!=", ">", "<", ">=", "<=", "contains", "not_contains", "in", "not_in", "is_empty", "is_not_empty");

    private final WorkflowMasterRepository masterRepository;
    private final WorkflowVersionRepository versionRepository;
    private final ObjectMapper objectMapper;

    public WorkflowValidationServiceImpl(WorkflowMasterRepository masterRepository,
                                         WorkflowVersionRepository versionRepository,
                                         ObjectMapper objectMapper) {
        this.masterRepository = masterRepository;
        this.versionRepository = versionRepository;
        this.objectMapper = objectMapper;
    }

    public WorkflowValidationResult validateWorkflowDefinition(String definitionJson) {
        WorkflowValidationResult result = new WorkflowValidationResult();
        result.setValid(true);

        if (definitionJson == null || definitionJson.trim().isEmpty()) {
            result.setValid(false);
            result.getErrors().add("Workflow definition is empty. Please provide a valid workflow configuration.");
            return result;
        }

        try {
            log.info("Starting workflow definition validation");
            WorkflowDefinitionStructure structure = objectMapper.readValue(definitionJson, WorkflowDefinitionStructure.class);

            if (structure == null) {
                result.setValid(false);
                result.getErrors().add("The workflow configuration format is invalid. Please check the file and try again.");
                return result;
            }

            log.info("Validating workflow: WorkflowId='{}', Version={}", structure.getWorkflowId(), structure.getVersion());

            // Step 1: Basic structural validation
            WorkflowValidationResult basicValidation = validateWorkflowStructure(structure);
            result.getErrors().addAll(basicValidation.getErrors());
            result.getWarnings().addAll(basicValidation.getWarnings());

            if (!basicValidation.isValid()) {
                result.setValid(false);
                log.warn("Basic structural validation failed with {} errors", basicValidation.getErrors().size());
                result.buildSummary();
                return result;
            }

            // Step 2: Validate sub-workflows existence
            List<WorkflowNode> subWorkflowNodes = structure.getNodes().stream()
                    .filter(n -> "sub_workflow".equals(n.getType()) && n.getConfig() != null && n.getConfig().getWorkflowDefinitionId() != null)
                    .collect(Collectors.toList());

            if (!subWorkflowNodes.isEmpty()) {
                log.info("Found {} sub-workflow node(s). Running sub-workflow validations...", subWorkflowNodes.size());
                validateSubWorkflowsExist(subWorkflowNodes, result);
                validateDuplicateRoles(structure, subWorkflowNodes, result);
            }

            // Step 3: Validate conditional action paths
            validateConditionalActionPaths(structure, result);

            // Step 4: Validate approval node action paths
            validateApprovalNodeActionPaths(structure, result);

            // Step 5: Validate reachable nodes
            validateReachableNodes(structure, result);

            // Step 5b: Validate all paths lead to END
            validateAllPathsLeadToEnd(structure, result);

            // Step 6: Validate no ambiguous branching
            validateNoBranchingAmbiguity(structure.getConnections(), structure.getNodes(), result);

            // Step 7: Validate no infinite loops
            validateNoInfiniteLoops(structure, result);

            result.setValid(result.getErrors().isEmpty());
            result.buildSummary();
            log.info("Workflow validation finished. IsValid: {}, Errors: {}, Warnings: {}",
                    result.isValid(), result.getErrors().size(), result.getWarnings().size());

            return result;

        } catch (Throwable ex) {
            result.setValid(false);
            result.getErrors().add("An unexpected error occurred during validation.");
            try { result.buildSummary(); } catch (Throwable ignored) {}
            log.error("Unexpected error during workflow validation", ex);
            return result;
        }
    }

    public WorkflowValidationResult validateWorkflowStructure(WorkflowDefinitionStructure structure) {
        WorkflowValidationResult result = new WorkflowValidationResult();
        result.setValid(true);

        if (structure.getWorkflowId() == null || structure.getWorkflowId().trim().isEmpty()) {
            result.getErrors().add("Workflow name is required. Please provide a name for your workflow.");
        }

        if (structure.getVersion() <= 0) {
            result.getErrors().add("Workflow version must be a positive number.");
        }

        if (structure.getNodes() == null || structure.getNodes().isEmpty()) {
            result.getErrors().add("Workflow must contain at least one step (node). Please add approval steps or decision points.");
        } else {
            validateNodes(structure, result);
        }

        if (structure.getConnections() == null || structure.getConnections().isEmpty()) {
            result.getErrors().add("Workflow steps must be connected. Please add connections between workflow steps.");
        } else {
            validateConnections(structure.getConnections(), structure.getNodes(), result);
        }

        long startCount = structure.getNodes() != null ? structure.getNodes().stream().filter(n -> "start".equals(n.getType())).count() : 0;
        if (startCount == 0) {
            result.getErrors().add("Every workflow must start with a 'Start' step. Please add a start step to your workflow.");
        } else if (startCount > 1) {
            result.getErrors().add("A workflow can only have one 'Start' step. Found " + startCount + " start steps.");
        }

        boolean hasEnd = structure.getNodes() != null && structure.getNodes().stream().anyMatch(n -> "end".equals(n.getType()));
        if (!hasEnd) {
            result.getErrors().add("Every workflow must end with an 'End' step. Please add an end step to your workflow.");
        }

        result.setValid(result.getErrors().isEmpty());
        result.buildSummary();
        return result;
    }

    private void validateNodes(WorkflowDefinitionStructure structure, WorkflowValidationResult result) {
        Set<String> nodeIds = new HashSet<>();
        List<WorkflowNode> nodes = structure.getNodes();

        for (WorkflowNode node : nodes) {
            if (node.getId() == null || node.getId().trim().isEmpty()) {
                result.getErrors().add("One of your workflow steps is missing an identifier. Please ensure all steps have unique IDs.");
                continue;
            }

            if (nodeIds.contains(node.getId())) {
                result.getErrors().add("Duplicate step identifier found: '" + node.getId() + "'. Each workflow step must have a unique identifier.");
            }
            nodeIds.add(node.getId());

            if (!VALID_NODE_TYPES.contains(node.getType())) {
                String nodeName = getNodeDisplayName(node);
                result.getErrors().add("Step '" + nodeName + "' has an invalid type. Valid step types are: Start, Approval, End, Conditional, and Sub-workflow.");
                continue;
            }

            NodeConfig config = node.getConfig();
            if (config == null) {
                String nodeName = getNodeDisplayName(node);
                result.getErrors().add("Step '" + nodeName + "' is missing its configuration. Please check the step settings.");
                continue;
            }

            switch (node.getType()) {
                case "start":
                    safeValidate(() -> validateStartNode(node, structure, result), node.getId(), result);
                    break;
                case "approval":
                    safeValidate(() -> validateApprovalNode(node, result), node.getId(), result);
                    break;
                case "sub_workflow":
                    safeValidate(() -> validateSubWorkflowNode(node, structure, result), node.getId(), result);
                    break;
                case "conditional":
                    safeValidate(() -> validateConditionalNode(node, result), node.getId(), result);
                    break;
                case "end":
                    safeValidate(() -> validateEndNode(node, structure, result), node.getId(), result);
                    break;
            }
        }
    }

    private void safeValidate(Runnable validator, String nodeId, WorkflowValidationResult result) {
        try {
            validator.run();
        } catch (Throwable ex) {
            result.getErrors().add("An unexpected error occurred while validating node '" + nodeId + "'.");
            log.error("Unexpected error validating node '{}'", nodeId, ex);
        }
    }

    private void validateStartNode(WorkflowNode node, WorkflowDefinitionStructure structure, WorkflowValidationResult result) {
        NodeConfig config = node.getConfig();
        if (config.getAssignee() != null || (config.getAssignees() != null && !config.getAssignees().isEmpty())) {
            result.getWarnings().add("The 'Start' step should not have approvers assigned. Remove assignees from the start step.");
        }

        if (config.getActions() != null && !config.getActions().isEmpty()) {
            result.getWarnings().add("The 'Start' step should not have actions. Start steps are used only to begin the workflow.");
        }

        if (config.getSla() != null) {
            result.getWarnings().add("The 'Start' step should not have time limits (SLA). SLAs should be set on approval steps.");
        }

        boolean hasOutgoing = structure.getConnections() != null && structure.getConnections().stream()
                .anyMatch(c -> node.getId().equals(c.getFrom()));

        if (!hasOutgoing) {
            result.getErrors().add("The 'Start' step must connect to at least one next step.");
        }
    }

    private void validateApprovalNode(WorkflowNode node, WorkflowValidationResult result) {
        NodeConfig config = node.getConfig();
        String nodeName = getNodeDisplayName(node);

        if (config.getLabel() == null || config.getLabel().trim().isEmpty()) {
            result.getErrors().add("APPROVAL STEP HAS NO NAME\n" +
                    "Location: Approval Step ('" + node.getId() + "')\n" +
                    "Problem: This approval step is missing a name. Without a name, people reviewing the workflow cannot tell what this step is for.\n\n" +
                    "How to Fix:\n" +
                    "1. Open your workflow designer\n" +
                    "2. Click on this approval step\n" +
                    "3. Find the Name or Label field in the settings panel\n" +
                    "4. Enter a clear, descriptive name such as 'Manager Approval' or 'Finance Review'\n\n" +
                    "Tip: Use names that explain the purpose of each approval step so the process is easy to follow.");
        }

        if (config.getApprovalMode() == null || !VALID_APPROVAL_MODES.contains(config.getApprovalMode())) {
            result.getErrors().add("APPROVAL MODE NOT SET\n" +
                    "Location: Approval Step '" + nodeName + "'\n" +
                    "Problem: The approval mode for this step is missing or not a valid option. The system does not know how to process approvals here.\n\n" +
                    "How to Fix:\n" +
                    "1. Open your workflow designer\n" +
                    "2. Click on the approval step '" + nodeName + "'\n" +
                    "3. Find the Approval Mode setting\n" +
                    "4. Choose one of the following options:\n" +
                    "   single — One person approves and the workflow continues\n" +
                    "   parallel_all — Every approver must approve before continuing\n" +
                    "   parallel_any — Any one approver can approve to continue\n\n" +
                    "Tip: Use single for most approvals. Use parallel modes only when multiple sign-offs are required.");
            return;
        }

        if ("single".equals(config.getApprovalMode())) {
            if (config.getAssignee() == null || config.getAssignee().getValue() == null || config.getAssignee().getValue().trim().isEmpty()) {
                result.getErrors().add("NO APPROVER ASSIGNED\n" +
                        "Location: Approval Step '" + nodeName + "'\n" +
                        "Problem: No one has been assigned to approve requests at this step. The workflow cannot proceed without an approver.\n\n" +
                        "How to Fix:\n" +
                        "1. Open your workflow designer\n" +
                        "2. Click on the approval step '" + nodeName + "'\n" +
                        "3. Find the Assignee field in the settings panel\n" +
                        "4. Select a role or a specific user who should approve requests here\n\n" +
                        "Tip: Assigning a role (like Manager or HR Team) is more flexible than assigning one specific person.");
            }
        } else {
            if (config.getAssignees() == null || config.getAssignees().size() < 2) {
                result.getErrors().add("NOT ENOUGH APPROVERS FOR PARALLEL APPROVAL\n" +
                        "Location: Approval Step '" + nodeName + "'\n" +
                        "Problem: This step is set to require multiple approvers, but fewer than 2 have been assigned. Parallel approval needs at least 2 people.\n\n" +
                        "How to Fix:\n" +
                        "1. Open your workflow designer\n" +
                        "2. Click on the approval step '" + nodeName + "'\n" +
                        "3. Find the Assignees section in the settings panel\n" +
                        "4. Click Add Assignee and select at least 2 different roles or users\n\n" +
                        "Tip: If only one approver is needed, switch the Approval Mode to single instead.");
            }
        }

        if (config.getActions() == null || config.getActions().isEmpty()) {
            result.getErrors().add("APPROVAL STEP HAS NO ACTIONS\n" +
                    "Location: Approval Step '" + nodeName + "'\n" +
                    "Problem: This step has no actions defined. The approver will have nothing to click when reviewing a request.\n\n" +
                    "How to Fix:\n" +
                    "1. Open your workflow designer\n" +
                    "2. Click on the approval step '" + nodeName + "'\n" +
                    "3. Find the Actions section in the settings panel\n" +
                    "4. Click Add Action and add at least these two actions:\n" +
                    "   approve — To approve the request and move it forward\n" +
                    "   reject — To reject the request\n\n" +
                    "Tip: After adding actions, draw connections from this step to show where the workflow goes for each action.");
        }

        if (config.getSla() != null) {
            SlaConfig sla = config.getSla();
            if (sla.getDuration() <= 0) {
                result.getErrors().add("TIME LIMIT VALUE IS INVALID\n" +
                        "Location: Approval Step '" + nodeName + "'\n" +
                        "Problem: The time limit for this step is set to zero or a negative number, which is not valid.\n\n" +
                        "How to Fix: Open the step settings and set the duration to a positive number, such as 2 hours, 8 hours, or 1 day.\n\n" +
                        "Tip: A time limit of 24 hours is a common default for approval steps.");
            }
            if (sla.getUnit() == null || !VALID_SLA_UNITS.contains(sla.getUnit())) {
                result.getErrors().add("TIME LIMIT UNIT IS INVALID\n" +
                        "Location: Approval Step '" + nodeName + "'\n" +
                        "Problem: The time unit for this step's time limit is missing or not a recognized option.\n\n" +
                        "How to Fix: Open the step settings and set the unit to one of the following: minutes, hours, or days.\n\n" +
                        "Tip: Most approval steps use hours as the unit.");
            }
        }
    }

    private void validateSubWorkflowNode(WorkflowNode node, WorkflowDefinitionStructure structure, WorkflowValidationResult result) {
        NodeConfig config = node.getConfig();
        String nodeName = getNodeDisplayName(node);
        if (config.getWorkflowDefinitionId() == null || config.getWorkflowDefinitionId() <= 0) {
            result.getErrors().add("Sub-workflow step '" + nodeName + "' must be linked to a workflow. Please select a valid workflow.");
        }
        if (config.getWorkflowVersionId() == null || config.getWorkflowVersionId() <= 0) {
            result.getErrors().add("Sub-workflow step '" + nodeName + "' must specify a workflow version. Please select a valid version.");
        }

        boolean hasSuccessAction = config.getSuccessAction() != null && !config.getSuccessAction().trim().isEmpty();
        boolean hasFailureAction = config.getFailureAction() != null && !config.getFailureAction().trim().isEmpty();

        if (!hasSuccessAction) {
            result.getErrors().add("Sub-workflow step '" + nodeName + "' must define what happens when the sub-workflow succeeds. Please specify a success action.");
        }
        if (!hasFailureAction) {
            result.getErrors().add("Sub-workflow step '" + nodeName + "' must define what happens when the sub-workflow fails. Please specify a failure action.");
        }

        Map<String, List<String>> outPaths = buildActionToNodesMapForNode(structure.getConnections(), node.getId());

        if (hasSuccessAction && !outPaths.containsKey(config.getSuccessAction().trim())) {
            result.getErrors().add("Sub-workflow step '" + nodeName + "' must have an outgoing connection for the success action: '" + config.getSuccessAction() + "'.");
        }
        if (hasFailureAction && !outPaths.containsKey(config.getFailureAction().trim())) {
            result.getErrors().add("Sub-workflow step '" + nodeName + "' must have an outgoing connection for the failure action: '" + config.getFailureAction() + "'.");
        }
    }

    private void validateConditionalNode(WorkflowNode node, WorkflowValidationResult result) {
        NodeConfig config = node.getConfig();
        String nodeName = getNodeDisplayName(node);

        if (config.getRules() == null || config.getRules().isEmpty()) {
            result.getErrors().add("DECISION STEP HAS NO RULES\n" +
                    "Location: Decision Step '" + nodeName + "'\n" +
                    "Problem: This decision step has no rules set up. Without rules, the system cannot decide which path to take.\n\n" +
                    "How to Fix:\n" +
                    "1. Open your workflow designer\n" +
                    "2. Click on the decision step '" + nodeName + "'\n" +
                    "3. In the settings panel, add at least one rule\n" +
                    "4. Each rule checks a value from the submitted form (for example: amount is greater than 10000)\n\n" +
                    "Tip: A rule decides which direction the workflow goes based on the submitted data.");
        } else {
            int ruleIndex = 1;
            for (ConditionalRule rule : config.getRules()) {
                if (rule == null) continue;

                List<RuleCondition> conditions = rule.getConditions();
                if (conditions == null || conditions.isEmpty()) {
                    result.getErrors().add("RULE HAS NO CONDITIONS\n" +
                            "Location: Decision Step '" + nodeName + "', Rule " + ruleIndex + "\n" +
                            "Problem: This rule has no conditions defined.\n\n" +
                            "How to Fix: Add at least one condition (field + operator + value) to this rule.");
                } else {
                    int condIndex = 1;
                    for (RuleCondition condition : conditions) {
                        if (condition == null) continue;
                        if (condition.getKey() == null || condition.getKey().trim().isEmpty()) {
                            result.getErrors().add("CONDITION IS MISSING A FIELD NAME\n" +
                                    "Location: Decision Step '" + nodeName + "', Rule " + ruleIndex + ", Condition " + condIndex + "\n" +
                                    "Problem: This condition does not specify which field to check.\n\n" +
                                    "How to Fix: Enter the field name in the first input (for example: amount, status, or department).\n\n" +
                                    "Tip: The field name should match a field in your submission form.");
                        }
                        String op = condition.getOperator();
                        if (op == null || op.isBlank()) {
                            result.getErrors().add("CONDITION IS MISSING A COMPARISON\n" +
                                    "Location: Decision Step '" + nodeName + "', Rule " + ruleIndex + ", Condition " + condIndex + "\n" +
                                    "Problem: This condition does not have a comparison selected.\n\n" +
                                    "How to Fix: Select a comparison from the dropdown, such as: equals, is greater than, is less than, or contains.");
                        } else if (!VALID_CONDITIONAL_OPERATORS.contains(op)) {
                            result.getErrors().add("CONDITION USES AN UNSUPPORTED COMPARISON\n" +
                                    "Location: Decision Step '" + nodeName + "', Rule " + ruleIndex + ", Condition " + condIndex + "\n" +
                                    "Problem: The comparison '" + op + "' is not supported.\n\n" +
                                    "How to Fix: Change the comparison to one of: =, !=, >, <, >=, <=, contains, not_contains, in, not_in, is_empty, is_not_empty");
                        }
                        condIndex++;
                    }
                }

                if (rule.getNextAction() == null || rule.getNextAction().trim().isEmpty()) {
                    result.getErrors().add("RULE HAS NO NEXT ACTION\n" +
                            "Location: Decision Step '" + nodeName + "', Rule " + ruleIndex + "\n" +
                            "Problem: This rule does not specify what should happen when it matches. Without this, the workflow will not know where to go.\n\n" +
                            "How to Fix:\n" +
                            "1. Open the decision step '" + nodeName + "'\n" +
                            "2. Find Rule " + ruleIndex + "\n" +
                            "3. Enter a value in the 'If Rule Matches' field (for example: approve, reject, or escalate)\n" +
                            "4. Then draw a connection from this step with that same label as the outgoing arrow\n\n" +
                            "Tip: The action name must exactly match the label on the outgoing connection.");
                }
                ruleIndex++;
            }
        }

        if (config.getDefaultAction() == null || config.getDefaultAction().trim().isEmpty()) {
            result.getErrors().add("DECISION STEP HAS NO DEFAULT ACTION\n" +
                    "Location: Decision Step '" + nodeName + "'\n" +
                    "Problem: There is no fallback action set for when none of the rules match. If a request does not match any rule, the workflow will get stuck.\n\n" +
                    "How to Fix:\n" +
                    "1. Open the decision step '" + nodeName + "'\n" +
                    "2. Scroll to the Default Action field at the bottom of the settings panel\n" +
                    "3. Enter what should happen when no rules match (for example: reject or escalate)\n" +
                    "4. Draw a connection from this step with that same label as the fallback path\n\n" +
                    "Tip: The default action ensures that every submission has a path to follow, even if it does not meet any specific rule.");
        }
    }

    private void validateEndNode(WorkflowNode node, WorkflowDefinitionStructure structure, WorkflowValidationResult result) {
        NodeConfig config = node.getConfig();
        String nodeName = getNodeDisplayName(node);
        if (config.getFinalStatus() == null || config.getFinalStatus().trim().isEmpty()) {
            result.getErrors().add("End step '" + nodeName + "' must specify a final status. This indicates how the workflow completed (e.g., Approved, Rejected, Completed).");
        }

        boolean hasOutgoing = structure.getConnections() != null && structure.getConnections().stream()
                .anyMatch(c -> node.getId().equals(c.getFrom()));

        if (hasOutgoing) {
            result.getErrors().add("End step '" + nodeName + "' cannot have any outgoing connections.");
        }
    }

    // Falls back to node ID so error messages are always actionable, even for unnamed nodes.
    private String getNodeDisplayName(WorkflowNode node) {
        if (node == null) return "Unknown";
        if (node.getConfig() != null && node.getConfig().getLabel() != null && !node.getConfig().getLabel().isEmpty()) {
            return node.getConfig().getLabel();
        }
        return node.getId();
    }

    private void validateConnections(List<WorkflowConnection> connections, List<WorkflowNode> nodes, WorkflowValidationResult result) {
        Set<String> nodeIds = nodes.stream().map(WorkflowNode::getId).collect(Collectors.toSet());
        Map<String, WorkflowNode> nodeMap = nodes.stream().collect(Collectors.toMap(WorkflowNode::getId, n -> n));

        for (WorkflowConnection conn : connections) {
            if (!nodeIds.contains(conn.getFrom())) {
                result.getErrors().add("A connection starts from a step that doesn't exist. Please check step ID: '" + conn.getFrom() + "'.");
                continue;
            }
            if (!nodeIds.contains(conn.getTo())) {
                result.getErrors().add("A connection leads to a step that doesn't exist. Please check step ID: '" + conn.getTo() + "'.");
                continue;
            }
            if (conn.getFrom() != null && conn.getFrom().equals(conn.getTo())) {
                String nodeName = getNodeDisplayName(nodeMap.get(conn.getFrom()));
                result.getErrors().add("Step '" + nodeName + "' connects to itself. Self-loops are not allowed.");
            }

            // START nodes move forward automatically — action labels on their connections are invalid
            WorkflowNode fromNode = nodeMap.get(conn.getFrom());
            if (fromNode != null && "start".equals(fromNode.getType())) {
                if (conn.getOnAction() != null && !conn.getOnAction().trim().isEmpty()) {
                    String nodeName = getNodeDisplayName(fromNode);
                    result.getErrors().add("The Start step '" + nodeName + "' has an action label on one of its connections. The Start step moves forward automatically and does not support actions on its connections. Please remove the action label.");
                }
            }
        }
    }

    private void validateSubWorkflowsExist(List<WorkflowNode> subWorkflowNodes, WorkflowValidationResult result) {
        for (WorkflowNode node : subWorkflowNodes) {
            String nodeName = getNodeDisplayName(node);
            Long masterId = node.getConfig().getWorkflowDefinitionId();
            Optional<WorkflowMaster> masterOpt = masterRepository.findByIdAndIsDeletedFalse(masterId);

            if (masterOpt.isEmpty()) {
                result.getErrors().add("Sub-workflow step '" + nodeName + "' references a workflow that doesn't exist. Please select a valid sub-workflow.");
            } else if (!masterOpt.get().isActive()) {
                result.getWarnings().add("Sub-workflow step '" + nodeName + "' is linked to an inactive workflow. Please activate the sub-workflow or select a different one.");
            }
        }
    }

    private void validateDuplicateRoles(WorkflowDefinitionStructure parentStructure, List<WorkflowNode> subWorkflowNodes, WorkflowValidationResult result) {
        Set<String> parentRoles = extractRolesFromWorkflow(parentStructure);
        if (parentRoles.isEmpty()) return;

        for (WorkflowNode subNode : subWorkflowNodes) {
            Long masterId = subNode.getConfig().getWorkflowDefinitionId();
            versionRepository.findFirstByWorkflowMasterIdAndIsActiveTrueAndIsDeletedFalse(masterId)
                    .ifPresent(ver -> {
                        try {
                            WorkflowDefinitionStructure childStructure = objectMapper.readValue(ver.getDefinitionJson(), WorkflowDefinitionStructure.class);
                            if (childStructure != null) {
                                Set<String> childRoles = extractRolesFromWorkflow(childStructure);
                                Set<String> duplicateRoles = parentRoles.stream().filter(childRoles::contains).collect(Collectors.toSet());
                                if (!duplicateRoles.isEmpty()) {
                                    result.getErrors().add("Duplicate role restriction: Child workflow uses role(s) already used in the parent workflow: " + duplicateRoles + ". Use different roles to avoid ambiguous task assignment.");
                                }
                            }
                        } catch (Exception ex) {
                            log.warn("Failed to parse child definition JSON for circular role check", ex);
                        }
                    });
        }
    }

    private Set<String> extractRolesFromWorkflow(WorkflowDefinitionStructure structure) {
        Set<String> roles = new HashSet<>();
        if (structure.getNodes() == null) return roles;

        for (WorkflowNode node : structure.getNodes()) {
            if ("approval".equals(node.getType()) && node.getConfig() != null) {
                NodeConfig config = node.getConfig();
                if ("single".equals(config.getApprovalMode())) {
                    if (config.getAssignee() != null && "role".equalsIgnoreCase(config.getAssignee().getType())) {
                        roles.add(config.getAssignee().getValue().trim());
                    }
                } else if (config.getAssignees() != null) {
                    for (Assignee assignee : config.getAssignees()) {
                        if ("role".equalsIgnoreCase(assignee.getType())) {
                            roles.add(assignee.getValue().trim());
                        }
                    }
                }
            }
        }
        return roles;
    }

    private void validateConditionalActionPaths(WorkflowDefinitionStructure structure, WorkflowValidationResult result) {
        List<WorkflowNode> conditionalNodes = structure.getNodes().stream().filter(n -> "conditional".equals(n.getType())).collect(Collectors.toList());
        if (conditionalNodes.isEmpty()) return;

        for (WorkflowNode conditionalNode : conditionalNodes) {
            NodeConfig config = conditionalNode.getConfig();
            Map<String, List<String>> nodeActionMap = buildActionToNodesMapForNode(structure.getConnections(), conditionalNode.getId());
            boolean hasRules = config.getRules() != null && !config.getRules().isEmpty();
            String nodeName = getNodeDisplayName(conditionalNode);

            if (hasRules) {
                int ruleIndex = 1;
                for (ConditionalRule rule : config.getRules()) {
                    if (rule == null) { ruleIndex++; continue; }
                    String nextAction = rule.getNextAction();
                    if (nextAction != null && !nextAction.trim().isEmpty()) {
                        if (!nodeActionMap.containsKey(nextAction.trim())) {
                            result.getErrors().add("Decision step '" + nodeName + "', Rule " + ruleIndex + " has no outgoing connection for action '" + nextAction + "'. Please draw a connection for this path.");
                        }
                    } else {
                        result.getErrors().add("Decision step '" + nodeName + "', Rule " + ruleIndex + " has no next action defined. Please set where the workflow should go when this rule matches.");
                    }
                    ruleIndex++;
                }

                String defaultAction = config.getDefaultAction();
                if (defaultAction == null || defaultAction.trim().isEmpty()) {
                    result.getErrors().add("Decision step '" + nodeName + "' has no default action. Please set a fallback path for when no rules match.");
                } else if (!nodeActionMap.containsKey(defaultAction.trim())) {
                    result.getErrors().add("Decision step '" + nodeName + "' has a default action '" + defaultAction + "' but no connection for it. Please draw a connection for the default path.");
                }

                if (nodeActionMap.isEmpty()) {
                    result.getErrors().add("Decision step '" + nodeName + "' has no outgoing connections. Please connect it to the next step in the workflow.");
                }
            } else {
                result.getErrors().add("Decision step '" + nodeName + "' has no rules defined. Please add at least one rule to determine which path the workflow takes.");
            }
        }
    }

    private Map<String, List<String>> buildActionToNodesMapForNode(List<WorkflowConnection> connections, String fromNodeId) {
        Map<String, List<String>> actionToNodes = new HashMap<>();
        if (connections == null || connections.isEmpty()) return actionToNodes;

        for (WorkflowConnection conn : connections) {
            if (!conn.getFrom().equals(fromNodeId)) continue;

            String action = null;
            if (conn.getOnAction() != null && !conn.getOnAction().trim().isEmpty()) {
                action = conn.getOnAction().trim();
            } else if (conn.getOn() != null && !conn.getOn().trim().isEmpty()) {
                action = conn.getOn().trim();
            }

            if (action != null && !action.isEmpty()) {
                actionToNodes.computeIfAbsent(action, k -> new ArrayList<>()).add(conn.getTo());
            }
        }

        return actionToNodes;
    }

    private void validateActionHasPathForNode(String nodeId, String action, Map<String, List<String>> nodeActionMap,
                                               Set<String> nodeIds, WorkflowValidationResult result) {
        List<String> targetNodes = nodeActionMap.get(action);
        String readableAction = switch (action) {
            case "approve" -> "Approve";
            case "reject" -> "Reject";
            case "forward" -> "Forward";
            case "backward" -> "Backward";
            case "send_back" -> "Send Back";
            default -> action;
        };

        if (targetNodes == null || targetNodes.isEmpty()) {
            result.getErrors().add("STEP HAS A MISSING CONNECTION\n" +
                    "Location: Step '" + nodeId + "', Action '" + readableAction + "'\n" +
                    "Problem: When someone selects '" + readableAction + "', the workflow does not know where to go next. There is no outgoing connection for this action.\n\n" +
                    "How to Fix:\n" +
                    "1. Open your workflow designer\n" +
                    "2. Find the step '" + nodeId + "'\n" +
                    "3. Draw an arrow from this step to the next step in the process\n" +
                    "4. Label the connection '" + readableAction + "'\n\n" +
                    "Tip: Every action in an approval step must have a connection pointing to the next step.");
        } else {
            for (String targetNode : targetNodes) {
                if (!nodeIds.contains(targetNode)) {
                    result.getErrors().add("STEP HAS AN INVALID CONNECTION\n" +
                            "Location: Step '" + nodeId + "', Action '" + readableAction + "'\n" +
                            "Problem: The connection for '" + readableAction + "' leads to a step ('" + targetNode + "') that no longer exists.\n\n" +
                            "How to Fix:\n" +
                            "1. Open your workflow designer\n" +
                            "2. Find the step '" + nodeId + "'\n" +
                            "3. Check the connection labeled '" + readableAction + "'\n" +
                            "4. Reconnect it to an existing step, or recreate the missing step\n\n" +
                            "Tip: All connections must point to steps that exist in the workflow.");
                }
            }
        }
    }

    private void validateApprovalNodeActionPaths(WorkflowDefinitionStructure structure, WorkflowValidationResult result) {
        List<WorkflowNode> approvalNodes = structure.getNodes().stream().filter(n -> "approval".equals(n.getType())).collect(Collectors.toList());
        if (approvalNodes.isEmpty()) return;

        Set<String> nodeIds = structure.getNodes().stream().map(WorkflowNode::getId).collect(Collectors.toSet());

        for (WorkflowNode approvalNode : approvalNodes) {
            NodeConfig config = approvalNode.getConfig();
            String nodeName = getNodeDisplayName(approvalNode);

            if (config.getActions() == null || config.getActions().isEmpty()) continue;

            Map<String, List<String>> nodeActionMap = buildActionToNodesMapForNode(structure.getConnections(), approvalNode.getId());

            if (nodeActionMap.isEmpty()) {
                result.getErrors().add("Approval step '" + nodeName + "' has actions defined but no outgoing connections. Please draw a connection for each action.");
            } else {
                for (ActionDefinitionDto nodeAction : config.getActions()) {
                    String actionId = nodeAction.getAction();
                    if (actionId != null && !actionId.trim().isEmpty()) {
                        validateActionHasPathForNode(approvalNode.getId(), actionId.trim(), nodeActionMap, nodeIds, result);
                    }
                }
            }
        }
    }

    private void validateReachableNodes(WorkflowDefinitionStructure structure, WorkflowValidationResult result) {
        Set<String> reachableNodes = new HashSet<>();
        Set<String> allNodeIds = new HashSet<>();

        for (WorkflowNode node : structure.getNodes()) {
            allNodeIds.add(node.getId());
            if ("start".equals(node.getType())) {
                reachableNodes.add(node.getId());
            }
        }

        boolean changed = true;
        while (changed) {
            changed = false;
            for (WorkflowConnection conn : structure.getConnections()) {
                if (reachableNodes.contains(conn.getFrom()) && !reachableNodes.contains(conn.getTo())) {
                    reachableNodes.add(conn.getTo());
                    changed = true;
                }
            }
        }

        for (String nodeId : allNodeIds) {
            if (!reachableNodes.contains(nodeId)) {
                WorkflowNode node = structure.getNodes().stream().filter(n -> n.getId().equals(nodeId)).findFirst().orElse(null);
                if (node != null && !"end".equals(node.getType())) {
                    String nodeName = getNodeDisplayName(node);
                    result.getWarnings().add("Step '" + nodeName + "' is not reachable from the start of the workflow. " +
                            "This step will never execute. Please add connections or remove this unused step.");
                }
            }
        }
    }

    private void validateAllPathsLeadToEnd(WorkflowDefinitionStructure structure, WorkflowValidationResult result) {
        WorkflowNode endNode = structure.getNodes().stream()
                .filter(n -> "end".equals(n.getType()))
                .findFirst()
                .orElse(null);

        if (endNode == null) return;

        Map<String, Set<String>> reverseGraph = new HashMap<>();
        for (WorkflowNode node : structure.getNodes()) {
            reverseGraph.put(node.getId(), new HashSet<>());
        }
        for (WorkflowConnection conn : structure.getConnections()) {
            reverseGraph.computeIfAbsent(conn.getTo(), k -> new HashSet<>()).add(conn.getFrom());
        }

        Set<String> nodesLeadingToEnd = new HashSet<>();
        nodesLeadingToEnd.add(endNode.getId());

        boolean changed = true;
        while (changed) {
            changed = false;
            for (WorkflowNode node : structure.getNodes()) {
                if (nodesLeadingToEnd.contains(node.getId()) && reverseGraph.containsKey(node.getId())) {
                    for (String predecessor : reverseGraph.get(node.getId())) {
                        if (nodesLeadingToEnd.add(predecessor)) {
                             changed = true;
                        }
                    }
                }
            }
        }

        WorkflowNode startNode = structure.getNodes().stream()
                .filter(n -> "start".equals(n.getType()))
                .findFirst()
                .orElse(null);

        if (startNode != null && !nodesLeadingToEnd.contains(startNode.getId())) {
            result.getErrors().add("The workflow has no complete path from the Start step to the End step. Please make sure at least one connected path leads all the way from start to finish.");
        }

        for (WorkflowNode node : structure.getNodes()) {
            if (!"end".equals(node.getType()) && !nodesLeadingToEnd.contains(node.getId())) {
                if (isNodeReachableFromStart(structure, node.getId())) {
                    String nodeName = getNodeDisplayName(node);
                    result.getErrors().add("Step '" + nodeName + "' is part of the workflow but has no path leading to the End step. This creates a dead end — please connect it forward to continue the workflow.");
                }
            }
        }
    }

    private boolean isNodeReachableFromStart(WorkflowDefinitionStructure structure, String targetNodeId) {
        WorkflowNode startNode = structure.getNodes().stream()
                .filter(n -> "start".equals(n.getType()))
                .findFirst()
                .orElse(null);

        if (startNode == null) return false;

        Set<String> reachable = new HashSet<>();
        reachable.add(startNode.getId());

        boolean changed = true;
        while (changed) {
            changed = false;
            for (WorkflowConnection conn : structure.getConnections()) {
                if (reachable.contains(conn.getFrom()) && reachable.add(conn.getTo())) {
                    if (conn.getTo().equals(targetNodeId)) return true;
                    changed = true;
                }
            }
        }
        return reachable.contains(targetNodeId);
    }

    private void validateNoBranchingAmbiguity(List<WorkflowConnection> connections, List<WorkflowNode> nodes, WorkflowValidationResult result) {
        Map<String, Set<String>> sourceActionMap = new HashMap<>();
        Map<String, WorkflowNode> nodeMap = nodes.stream().collect(Collectors.toMap(WorkflowNode::getId, n -> n));

        for (WorkflowConnection conn : connections) {
            String action = conn.getOnAction() != null ? conn.getOnAction() : (conn.getOn() != null ? conn.getOn() : "default");
            String key = conn.getFrom() + "|" + action;
            sourceActionMap.computeIfAbsent(key, k -> new HashSet<>()).add(conn.getTo());
        }

        for (Map.Entry<String, Set<String>> entry : sourceActionMap.entrySet()) {
            if (entry.getValue().size() > 1) {
                String[] parts = entry.getKey().split("\\|");
                String fromId = parts[0];
                String action = parts.length > 1 ? parts[1] : "default";
                String nodeName = getNodeDisplayName(nodeMap.get(fromId));
                result.getErrors().add("STEP HAS DUPLICATE CONNECTIONS FOR THE SAME ACTION\n" +
                        "Location: Step '" + nodeName + "', Action '" + action + "'\n" +
                        "Problem: When '" + action + "' is triggered, there are multiple outgoing connections with the same label. The system does not know which one to follow.\n\n" +
                        "How to Fix:\n" +
                        "1. Open your workflow designer\n" +
                        "2. Find the step '" + nodeName + "'\n" +
                        "3. Look for all connections labeled '" + action + "'\n" +
                        "4. Keep only one connection with this label and delete the duplicates\n\n" +
                        "Tip: Each action can only lead to one next step.");
            }
        }
    }

    private void validateNoInfiniteLoops(WorkflowDefinitionStructure structure, WorkflowValidationResult result) {
        List<WorkflowConnection> connections = structure.getConnections();
        List<WorkflowNode> nodes = structure.getNodes();
        if (connections == null || connections.isEmpty() || nodes == null || nodes.isEmpty()) return;

        Map<String, List<String>> adj = new HashMap<>();
        for (WorkflowConnection conn : connections) {
            if (conn.getFrom() != null && conn.getTo() != null && !conn.getFrom().equals(conn.getTo())) {
                adj.computeIfAbsent(conn.getFrom(), k -> new ArrayList<>()).add(conn.getTo());
            }
        }

        Set<String> visited = new HashSet<>();
        Set<String> recStack = new HashSet<>();
        List<List<String>> cycles = new ArrayList<>();

        for (WorkflowNode node : nodes) {
            if (!visited.contains(node.getId())) {
                dfsCycle(node.getId(), adj, visited, recStack, cycles, new ArrayList<>());
            }
        }

        if (!cycles.isEmpty()) {
            result.getWarnings().add("WORKFLOW HAS BACKWARD LOOPS\n" +
                    "Note: This workflow has " + cycles.size() + " path(s) that loop back to an earlier step.\n\n" +
                    "Things to Review:\n" +
                    "1. Are these loops intentional? For example, a rejection that sends the request back for corrections.\n" +
                    "2. Is there a way for users to eventually finish the process and not stay stuck in the loop?\n" +
                    "3. Are the steps clearly labeled so users understand when a loop-back should happen?\n\n" +
                    "Tip: Loops can be useful for revision cycles, but make sure every loop has a way out.");
        }
    }

    private void dfsCycle(String curr, Map<String, List<String>> adj, Set<String> visited, Set<String> recStack, List<List<String>> cycles, List<String> path) {
        visited.add(curr);
        recStack.add(curr);
        path.add(curr);

        if (adj.containsKey(curr)) {
            for (String neighbor : adj.get(curr)) {
                if (!visited.contains(neighbor)) {
                    dfsCycle(neighbor, adj, visited, recStack, cycles, path);
                } else if (recStack.contains(neighbor)) {
                    cycles.add(new ArrayList<>(path));
                }
            }
        }

        recStack.remove(curr);
        path.remove(path.size() - 1);
    }
}
