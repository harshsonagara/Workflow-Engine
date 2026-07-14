package com.sttl.workflow.query.service.impl;

import com.sttl.workflow.definition.dto.node.ActionDefinitionDto;
import com.sttl.workflow.definition.dto.node.ConditionalRule;
import com.sttl.workflow.definition.dto.workflow.WorkflowDefinitionStructure;
import com.sttl.workflow.definition.dto.workflow.WorkflowNode;
import com.sttl.workflow.query.dto.*;
import com.sttl.workflow.runtime.entity.WorkflowAuditLog;
import com.sttl.workflow.runtime.entity.WorkflowInstance;
import com.sttl.workflow.runtime.repository.WorkflowAuditLogRepository;
import com.sttl.workflow.runtime.repository.WorkflowInstanceRepository;
import com.sttl.workflow.service.WorkflowDefinitionParser;
import com.sttl.workflow.task.entity.WorkflowTask;
import com.sttl.workflow.task.repository.WorkflowTaskRepository;
import com.sttl.workflow.version.entity.WorkflowVersion;
import com.sttl.workflow.version.repository.WorkflowVersionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

/**
 * **Implementation of query and reporting service.**
 * <p>
 * Read-only operations for diagnostics and reporting. All methods use
 *
 * @Transactional (readOnly = true) for optimal database performance.
 */
@Service
@Slf4j
@Transactional(readOnly = true)
public class WorkflowQueryServiceImpl {

    private final WorkflowInstanceRepository instanceRepo;
    private final WorkflowAuditLogRepository auditRepo;
    private final WorkflowTaskRepository taskRepo;
    private final WorkflowVersionRepository versionRepo;
    private final WorkflowDefinitionParser definitionParser;

    public WorkflowQueryServiceImpl(
            WorkflowInstanceRepository instanceRepo,
            WorkflowAuditLogRepository auditRepo,
            WorkflowTaskRepository taskRepo,
            WorkflowVersionRepository versionRepo,
            WorkflowDefinitionParser definitionParser
    ){
        this.instanceRepo = instanceRepo;
        this.auditRepo = auditRepo;
        this.taskRepo = taskRepo;
        this.versionRepo = versionRepo;
        this.definitionParser = definitionParser;
    }

   
    public List<MySubmissionDto> getMySubmissions(String userId) {
        if (userId == null) {
            return Collections.emptyList();
        }
        return instanceRepo.findByCreatedByOrderByCreatedAtDesc(userId).stream()
                .map(i -> MySubmissionDto.builder()
                        .instanceId(i.getId())
                        .recordId(i.getBusinessKey())
                        .workflowName(i.getWorkflowVersion().getWorkflowMaster().getWorkflowName())
                        .status(i.getStatus())
                        .currentNodeId(i.getCurrentNodeId())
                        .submittedAt(i.getCreatedAt())
                        .completedAt(i.getCompletedAt())
                        .build())
                .collect(Collectors.toList());
    }

   
    public List<ApplicationHistoryDto> getApplicationHistory(String recordId) {
        WorkflowInstance instance = instanceRepo.findLatestByBusinessKey(recordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Instance not found for key: " + recordId));

        // ASC — oldest first so the timeline reads top-to-bottom chronologically
        List<WorkflowAuditLog> logs = auditRepo.findAllByWorkflowInstanceIdOrderByCreatedAtAsc(instance.getId());

        // Build nodeLabel → task_created timestamp map for duration computation
        Map<String, java.time.OffsetDateTime> taskCreatedAt = logs.stream()
                .filter(l -> "task_created".equals(l.getAction()) && l.getNodeLabel() != null)
                .collect(Collectors.toMap(
                        WorkflowAuditLog::getNodeLabel,
                        WorkflowAuditLog::getCreatedAt,
                        (first, second) -> first   // keep earliest when a node repeats
                ));

        // Build nodeLabel → (actionKey → label) and nodeLabel → (actionKey → resultStatus)
        // from the definition snapshot so history shows the designer-configured label
        // (e.g. "Forward to HR Department") rather than a title-cased key guess.
        Map<String, Map<String, String>> actionLabels  = new HashMap<>();
        Map<String, Map<String, String>> actionStatuses = new HashMap<>();
        try {
            WorkflowDefinitionStructure structure = definitionParser.parseVersionJson(
                    instance.getWorkflowVersionId(), instance.getDefinitionSnapshot());
            for (WorkflowNode node : structure.getNodes()) {
                if (node.getConfig() == null || node.getConfig().getActions() == null) continue;
                String nodeLabel = node.getConfig().getLabel();
                if (nodeLabel == null) continue;
                Map<String, String> lblMap = new HashMap<>();
                Map<String, String> stMap  = new HashMap<>();
                for (ActionDefinitionDto a : node.getConfig().getActions()) {
                    if (a.getAction() == null) continue;
                    String key = a.getAction().toLowerCase();
                    if (a.getLabel() != null && !a.getLabel().isBlank())
                        lblMap.put(key, a.getLabel());
                    if (a.getResultStatus() != null && !a.getResultStatus().isBlank())
                        stMap.put(key, a.getResultStatus());
                }
                actionLabels.put(nodeLabel, lblMap);
                actionStatuses.put(nodeLabel, stMap);
            }
        } catch (Exception e) {
            log.warn("Could not parse definition snapshot for label lookup on instance {} — falling back to key humanization", instance.getId());
        }

        // Nodes that already have a user/system action recorded — their task_created "Awaiting Approval"
        // row is noise in the final history; only keep it while the step is still pending.
        Set<String> actionedNodes = logs.stream()
                .filter(l -> l.getAction() != null
                        && l.getAction().startsWith("task_")
                        && !"task_created".equals(l.getAction())
                        && l.getNodeLabel() != null)
                .map(WorkflowAuditLog::getNodeLabel)
                .collect(java.util.stream.Collectors.toSet());

        return logs.stream()
                // auto_progress and node_transition are internal bookkeeping.
                .filter(l -> !"auto_progress".equals(l.getAction()) && !"node_transition".equals(l.getAction()))
                // Hide "Sent for Review" for steps that have already been acted on.
                .filter(l -> !("task_created".equals(l.getAction()) && actionedNodes.contains(l.getNodeLabel())))
                .map(l -> {
            String act = l.getAction();
            Map<String, Object> ctx = l.getContextData();

            Long durationSeconds = null;
            boolean isUserTaskAction = act != null && act.startsWith("task_") && !"task_created".equals(act);
            if (isUserTaskAction && l.getNodeLabel() != null) {
                java.time.OffsetDateTime created = taskCreatedAt.get(l.getNodeLabel());
                if (created != null)
                    durationSeconds = java.time.Duration.between(created, l.getCreatedAt()).getSeconds();
            }

            // Look up the designer-configured label for this action from the definition
            String configuredLabel  = null;
            String configuredStatus = null;
            if (isUserTaskAction && l.getNodeLabel() != null) {
                String actionKey = act.substring(5).toLowerCase();
                Map<String, String> lblMap = actionLabels.get(l.getNodeLabel());
                if (lblMap != null) configuredLabel = lblMap.get(actionKey);
                Map<String, String> stMap = actionStatuses.get(l.getNodeLabel());
                if (stMap != null) configuredStatus = stMap.get(actionKey);
            }

            java.time.OffsetDateTime slaDeadline  = extractDateTime(ctx, "slaDeadline");
            java.time.OffsetDateTime slaBreachedAt = extractDateTime(ctx, "slaBreachedAt");
            String escalatedTo = ctx != null ? (String) ctx.get("escalatedTo") : null;

            return ApplicationHistoryDto.builder()
                    .title(configuredLabel != null ? configuredLabel : getEventTitle(act))
                    .step(l.getNodeLabel())
                    .action(configuredLabel != null ? configuredLabel : getUserActionLabel(act))
                    .by(l.getPerformedByName() != null ? l.getPerformedByName()
                            : l.getPerformedBy() != null ? l.getPerformedBy() : "System")
                    .actorId(l.getPerformedBy())
                    .role(l.getPerformedByRole())
                    .fromNode(l.getSourceNodeId())
                    .toNode(l.getTargetNodeId())
                    .durationSeconds(durationSeconds)
                    .slaDeadline(slaDeadline)
                    .slaBreachedAt(slaBreachedAt)
                    .escalatedTo(escalatedTo)
                    .remarks(getCleanRemarks(l.getRemarks()))
                    .date(l.getCreatedAt())
                    .status(configuredStatus != null ? configuredStatus : getResultStatus(act))
                    .build();
        }).collect(Collectors.toList());
    }

    public AvailableActionsDto getAvailableActions(Long versionId) {
        WorkflowVersion version = versionRepo.findByIdAndIsDeletedFalse(versionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Version not found: " + versionId));

        try {
            WorkflowDefinitionStructure structure = definitionParser.parseVersionJson(
                    version.getId(), version.getDefinitionJson());
            WorkflowNode endNode = structure.getNodes().stream()
                    .filter(n -> "end".equalsIgnoreCase(n.getType()))
                    .findFirst().orElse(null);

            if (endNode == null) {
                return AvailableActionsDto.builder().success(false).message("No end node").build();
            }

            List<String> actions = structure.getConnections().stream()
                    .filter(c -> c.getTo().equalsIgnoreCase(endNode.getId()))
                    .map(c -> c.getOnAction() != null ? c.getOnAction() : c.getOn())
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toList());

            return AvailableActionsDto.builder()
                    .success(true)
                    .actions(actions)
                    .message("Available actions resolved")
                    .build();

        } catch (Exception e) {
            log.error("Failed to resolve available actions for version {}: {}", versionId, e.getMessage());
            return AvailableActionsDto.builder().success(false).message("Unable to retrieve available actions.").build();
        }
    }

   
    public WorkflowDashboardStatsResult getDashboardStats() {
        Object[] stats = instanceRepo.getDashboardStats();
        if (stats != null && stats.length > 0) {
            Object[] row = (Object[]) stats[0];
            return WorkflowDashboardStatsResult.builder()
                    .completed(Long.parseLong(row[0].toString()))
                    .inProcess(Long.parseLong(row[1].toString()))
                    .submitted(Long.parseLong(row[2].toString()))
                    .build();
        }
        return WorkflowDashboardStatsResult.builder().build();
    }


    public List<ApplicationHistoryDto> getRecentActivities() {
        return auditRepo.findAll(PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt")))
                .stream()
                .map(log -> ApplicationHistoryDto.builder()
                        .title(getEventTitle(log.getAction()))
                        .step(log.getNodeLabel())  // null for system-level events — excluded by @JsonInclude NON_NULL
                        .action(getUserActionLabel(log.getAction()))
                        .by(log.getPerformedByName() != null ? log.getPerformedByName()
                                : log.getPerformedBy() != null ? log.getPerformedBy() : "System")
                        .actorId(log.getPerformedBy())
                        .remarks(getCleanRemarks(log.getRemarks()))
                        .date(log.getCreatedAt())
                        .status(getResultStatus(log.getAction()))
                        .build())
                .collect(Collectors.toList());
    }

   
    public ConditionalKeysResponseDto getConditionalKeys(Long workflowId, int version) {
        WorkflowVersion ver = versionRepo
                .findFirstByWorkflowMasterIdAndIsActiveTrueAndIsDeletedFalse(workflowId)
                .orElseGet(() -> versionRepo
                        .findAllByWorkflowMasterIdAndIsDeletedFalse(workflowId)
                        .stream()
                        .findFirst()
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "No versions found for workflow master " + workflowId)));
        WorkflowDefinitionStructure structure = definitionParser.parseVersionJson(ver.getId(), ver.getDefinitionJson());
        return extractConditionalKeys(ver.getWorkflowMaster().getWorkflowName(), version, structure);
    }

   
    public ConditionalKeysResponseDto getConditionalKeysByName(String workflowName, int version) {
        // Using versionRepo directly to find by name
        List<WorkflowVersion> versions = versionRepo.findAllByWorkflowMasterWorkflowNameAndIsDeletedFalse(workflowName);

        if (versions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Workflow '" + workflowName + "' not found");
        }

        final int targetVersion = version;
        WorkflowVersion ver = versions.stream()
                .filter(v -> {
                    try {
                        String vn = v.getVersionName();
                        if (vn.startsWith("v") || vn.startsWith("V")) vn = vn.substring(1);
                        return Integer.parseInt(vn.trim()) == targetVersion;
                    } catch (Exception e) {
                        return false;
                    }
                })
                .findFirst()
                .orElseGet(() -> versions.stream()
                        .filter(v -> v.isActive() && !v.isDeleted())
                        .findFirst()
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "No version " + targetVersion + " found for workflow '" + workflowName + "'")));

        WorkflowDefinitionStructure structure = definitionParser.parseVersionJson(ver.getId(), ver.getDefinitionJson());
        return extractConditionalKeys(workflowName, version, structure);
    }

   
    public Map<String, Object> getDiagnosticInfo(String recordId, String userId, String roleCode) {
        Map<String, Object> diagnostic = new HashMap<>();
        diagnostic.put("recordId", recordId);
        diagnostic.put("userId", userId);
        diagnostic.put("roleCode", roleCode);
        diagnostic.put("timestamp", java.time.OffsetDateTime.now());

        Optional<WorkflowInstance> instanceOpt = instanceRepo.findActiveInstanceByBusinessKey(recordId);
        if (instanceOpt.isEmpty()) {
            diagnostic.put("instanceExists", false);
            diagnostic.put("issue", "NO_INSTANCE_FOUND");
            diagnostic.put("resolution", "Start workflow using POST /workflow-engine-api/workflow-runtime/start endpoint");
            return diagnostic;
        }

        WorkflowInstance instance = instanceOpt.get();
        diagnostic.put("instanceExists", true);
        diagnostic.put("instanceId", instance.getId());
        diagnostic.put("instanceStatus", instance.getStatus());
        diagnostic.put("currentNodeId", instance.getCurrentNodeId());
        diagnostic.put("workflowName", instance.getWorkflowVersion() != null ? instance.getWorkflowVersion().getWorkflowMaster().getWorkflowName() : "Unknown");
        diagnostic.put("completedAt", instance.getCompletedAt());

        if (instance.getCompletedAt() != null) {
            diagnostic.put("issue", "INSTANCE_COMPLETED");
            diagnostic.put("resolution", "Workflow instance has already completed. Start a new workflow instance.");
            return diagnostic;
        }

        List<WorkflowTask> allTasks = taskRepo.findAllByWorkflowInstanceId(instance.getId());
        diagnostic.put("totalTasks", allTasks.size());

        List<WorkflowTask> pendingTasks = allTasks.stream()
                .filter(t -> "pending".equalsIgnoreCase(t.getStatus()))
                .toList();
        diagnostic.put("pendingTasks", pendingTasks.size());

        if (pendingTasks.isEmpty()) {
            diagnostic.put("issue", "NO_PENDING_TASKS");
            diagnostic.put("resolution", "All tasks completed. Workflow may be waiting for auto-progression or has completed.");
            diagnostic.put("lastTaskStatus", allTasks.stream()
                    .max((a, b) -> a.getCreatedAt().compareTo(b.getCreatedAt()))
                    .map(WorkflowTask::getStatus)
                    .orElse("Unknown"));
            return diagnostic;
        }

        List<WorkflowTask> userTasks = pendingTasks.stream()
                .filter(t -> userId != null && (userId.equals(t.getResolvedAssignedTo())
                        || (roleCode != null && roleCode.equals(t.getResolvedAssignedRole()))))
                .toList();

        diagnostic.put("userHasPendingTask", !userTasks.isEmpty());

        if (userTasks.isEmpty()) {
            Map<String, Object> taskAssignments = new HashMap<>();
            for (WorkflowTask task : pendingTasks) {
                taskAssignments.put("task_" + task.getId(),
                        Map.of("assignedTo", task.getResolvedAssignedTo() != null ? task.getResolvedAssignedTo() : "None",
                                "assignedRole", task.getResolvedAssignedRole() != null ? task.getResolvedAssignedRole() : "None"));
            }
            diagnostic.put("issue", "NO_TASK_FOR_USER");
            diagnostic.put("taskAssignments", taskAssignments);
            diagnostic.put("resolution", "No pending task assigned to this user. Check task assignments or wait for task assignment.");
            return diagnostic;
        }

        diagnostic.put("issue", null);
        diagnostic.put("resolution", "All conditions met. Actions endpoint should work.");
        diagnostic.put("taskDetails", userTasks.stream()
                .map(t -> Map.of(
                        "taskId", t.getId(),
                        "nodeId", t.getNodeId(),
                        "status", t.getStatus(),
                        "assignedTo", t.getResolvedAssignedTo() != null ? t.getResolvedAssignedTo() : "None"
                ))
                .collect(Collectors.toList()));

        return diagnostic;
    }

    // ==============================================================================
    // PRIVATE HELPER METHODS
    // ==============================================================================

    private ConditionalKeysResponseDto extractConditionalKeys(String workflowName, int version,
                                                              WorkflowDefinitionStructure structure) {
        List<WorkflowNode> conditionalNodes = structure.getNodes().stream()
                .filter(n -> "conditional".equalsIgnoreCase(n.getType()))
                .toList();

        List<ConditionalKeysResponseDto.ConditionalNodeKeysDto> nodeKeysList = new ArrayList<>();
        Set<String> allKeys = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);

        for (WorkflowNode node : conditionalNodes) {
            ConditionalKeysResponseDto.ConditionalNodeKeysDto nodeKeys = ConditionalKeysResponseDto.ConditionalNodeKeysDto
                    .builder()
                    .nodeId(node.getId())
                    .label(node.getConfig().getLabel() != null ? node.getConfig().getLabel()
                            : "Conditional Node " + node.getId())
                    .keys(new ArrayList<>())
                    .build();

            if (node.getConfig().getRules() != null) {
                for (ConditionalRule rule : node.getConfig().getRules()) {
                    if (rule.getConditions() == null) continue;
                    for (ConditionalRule.RuleCondition cond : rule.getConditions()) {
                        if (cond.getKey() != null && !cond.getKey().trim().isEmpty()) {
                            nodeKeys.getKeys().add(ConditionalKeysResponseDto.ConditionalKeyDto.builder()
                                    .key(cond.getKey())
                                    .operator(cond.getOperator())
                                    .value(cond.getValue() != null ? cond.getValue().toString() : "")
                                    .nextAction(rule.getNextAction())
                                    .build());
                            allKeys.add(cond.getKey());
                        }
                    }
                }
            }
            nodeKeysList.add(nodeKeys);
        }

        return ConditionalKeysResponseDto.builder()
                .workflowName(workflowName)
                .version(version)
                .conditionalNodes(nodeKeysList)
                .allUniqueKeys(new ArrayList<>(allKeys))
                .build();
    }

    /** Human-readable label for what event occurred. */
    private String getEventTitle(String action) {
        if (action == null) return "System Event";
        return switch (action.toLowerCase()) {
            case "workflow_started"      -> "Application Submitted";
            case "workflow_completed"    -> "Application Completed";
            case "task_created"          -> "Sent for Review";
            case "auto_progress"         -> "Moved to Next Step";
            case "node_transition"       -> "Step Transition";
            case "conditional_evaluated" -> "Decision Made";
            case "sent_back_to_start"    -> "Returned to Applicant";
            case "sla_breached"             -> "Overdue";
            case "sla_escalated_to_role"    -> "Escalated";
            case "sla_returned_to_previous" -> "Returned (Overdue)";
            default -> {
                if (action.startsWith("task_")) {
                    // task_forward → "Forwarded", task_submit_response → "Response Submitted"
                    yield humanizeTaskVerb(action.substring(5));
                }
                String t = action.replace("_", " ").trim();
                yield t.isEmpty() ? action : Character.toUpperCase(t.charAt(0)) + t.substring(1);
            }
        };
    }

    /**
     * The specific action the user chose — only for user-triggered task events.
     * Returns null for system events (excluded from JSON by @JsonInclude NON_NULL).
     */
    private String getUserActionLabel(String action) {
        // task_created is system-generated — no user chose it
        if (action == null || !action.startsWith("task_") || action.equalsIgnoreCase("task_created")) return null;
        return humanizeTaskVerb(action.substring(5));
    }

    /** Resulting state after this event. */
    private String getResultStatus(String action) {
        if (action == null) return "Unknown";
        return switch (action.toLowerCase()) {
            case "workflow_started"      -> "Submitted";
            case "workflow_completed"    -> "Completed";
            case "auto_progress",
                 "node_transition",
                 "conditional_evaluated" -> "In Progress";
            case "task_created"          -> "Awaiting Approval";
            case "sent_back_to_start", "sla_returned_to_previous" -> "Returned to Applicant";
            case "sla_breached"             -> "Overdue";
            case "sla_escalated_to_role"    -> "Escalated";
            default -> {
                if (action.startsWith("task_")) {
                    yield humanizeTaskVerb(action.substring(5));
                }
                String s = action.replace("_", " ").trim();
                yield s.isEmpty() ? action : Character.toUpperCase(s.charAt(0)) + s.substring(1);
            }
        };
    }

    /** Returns null (excluded from JSON) when remarks are empty or purely internal noise. */
    private String getCleanRemarks(String remarks) {
        if (remarks == null || remarks.isBlank()) return null;
        if (remarks.startsWith("Auto progressed from start node")) return null;
        if (remarks.startsWith("Workflow started for")) return null;
        if (remarks.startsWith("Workflow progressed to")) return null;
        if (remarks.equals("Workflow Completed") || remarks.equals("Completed")) return null;
        if (remarks.startsWith("Conditional evaluated to:"))
            return "Decision: " + remarks.substring("Conditional evaluated to:".length()).trim();
        if (remarks.startsWith("Created") && remarks.contains("task(s) for"))
            return null; // step label already shows where it was sent
        return remarks;
    }

    /**
     * Converts a raw task verb suffix into a readable label.
     * Common workflow actions get specific labels; everything else is title-cased.
     * "forward" → "Forwarded", "submit_response" → "Submit Response"
     */
    private java.time.OffsetDateTime extractDateTime(Map<String, Object> ctx, String key) {
        if (ctx == null) return null;
        Object val = ctx.get(key);
        if (val == null) return null;
        try { return java.time.OffsetDateTime.parse(val.toString()); } catch (Exception e) { return null; }
    }

    private String humanizeTaskVerb(String verb) {
        if (verb == null || verb.isBlank()) return "Action Taken";
        return switch (verb.toLowerCase()) {
            case "approve", "approved"         -> "Approved";
            case "reject", "rejected"          -> "Rejected";
            case "forward", "forwarded"        -> "Forwarded";
            case "return", "returned",
                 "send_back", "sent_back"      -> "Sent Back";
            case "created"                     -> "Task Assigned";
            default -> {
                String s = verb.replace("_", " ").trim();
                yield s.isEmpty() ? verb : Character.toUpperCase(s.charAt(0)) + s.substring(1);
            }
        };
    }
}
