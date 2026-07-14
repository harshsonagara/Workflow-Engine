package com.sttl.workflow.runtime.service.impl;

import com.sttl.workflow.definition.dto.node.NodeConfig.Assignee;
import com.sttl.workflow.definition.dto.node.ConditionalRule;
import com.sttl.workflow.definition.dto.node.NodeConfig;
import com.sttl.workflow.definition.dto.sla.SlaConfig;
import com.sttl.workflow.definition.dto.workflow.WorkflowConnection;
import com.sttl.workflow.definition.dto.workflow.WorkflowDefinitionStructure;
import com.sttl.workflow.definition.dto.workflow.WorkflowNode;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.sttl.workflow.task.dto.WorkflowTaskDto;
import com.sttl.workflow.runtime.entity.WorkflowAuditLog;
import com.sttl.workflow.runtime.entity.WorkflowInstance;
import com.sttl.workflow.task.entity.WorkflowTask;
import com.sttl.workflow.runtime.entity.WorkflowTransitionHistory;
import com.sttl.workflow.runtime.repository.WorkflowAuditLogRepository;
import com.sttl.workflow.runtime.repository.WorkflowInstanceRepository;
import com.sttl.workflow.task.repository.WorkflowTaskRepository;
import com.sttl.workflow.runtime.repository.WorkflowTransitionHistoryRepository;
import com.sttl.workflow.monitoring.service.impl.SlaProcessingServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@Transactional
public class WorkflowStateTransitionServiceImpl {

    private final WorkflowInstanceRepository instanceRepo;
    private final WorkflowTaskRepository taskRepo;
    private final WorkflowAuditLogRepository auditRepo;
    private final WorkflowTransitionHistoryRepository transitionHistoryRepo;
    private final SlaProcessingServiceImpl slaService;

    public WorkflowStateTransitionServiceImpl(
            WorkflowInstanceRepository instanceRepo,
            WorkflowTaskRepository taskRepo,
            WorkflowAuditLogRepository auditRepo,
            WorkflowTransitionHistoryRepository transitionHistoryRepo,
            SlaProcessingServiceImpl slaService
    ){
        this.instanceRepo = instanceRepo;
        this.taskRepo = taskRepo;
        this.auditRepo = auditRepo;
        this.transitionHistoryRepo = transitionHistoryRepo;
        this.slaService = slaService;
    }

    public String progressFromStartNode(Long instanceId, WorkflowDefinitionStructure structure,
            WorkflowNode startNode, String performedBy, String performedByName, List<WorkflowTaskDto> createdTasks) {

        Map<String, WorkflowNode> nodeMap = buildNodeMap(structure);
        Map<String, List<WorkflowConnection>> connMap = buildConnectionMap(structure);

        WorkflowConnection conn = connMap.getOrDefault(startNode.getId(), Collections.emptyList())
                .stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,"No outgoing connection from start node"));

        WorkflowNode nextNode = Optional.ofNullable(nodeMap.get(conn.getTo()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
                        "Target node '" + conn.getTo() + "' not found in definition"));

        WorkflowInstance instance = instanceRepo.findById(instanceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Workflow instance not found: " + instanceId));

        auditRepo.save(WorkflowAuditLog.builder()
                .workflowInstance(instance)
                .action("auto_progress")
                .performedBy(performedBy)
                .performedByName(performedByName)
                .remarks(String.format("Auto progressed from start node '%s' to '%s'",
                        startNode.getId(), nextNode.getId()))
                .build());

        if ("approval".equalsIgnoreCase(nextNode.getType())) {
            List<WorkflowTask> tasks = createTasksForApprovalNode(instance, nextNode);
            createdTasks.addAll(tasks.stream().map(WorkflowTaskDto::from).toList());
            String label = nextNode.getConfig() != null ? nextNode.getConfig().getLabel() : nextNode.getId();
            auditRepo.save(WorkflowAuditLog.builder()
                    .workflowInstance(instance)
                    .action("task_created")
                    .performedBy(performedBy)
                    .performedByName(performedByName)
                    .nodeLabel(label)
                    .contextData(slaContextData(tasks))
                    .remarks(String.format("Created %d task(s) for '%s'", tasks.size(), nextNode.getId()))
                    .build());
        } else if ("conditional".equalsIgnoreCase(nextNode.getType())) {
            handleConditionalNode(instance, structure, connMap, nextNode, performedBy, performedByName);
            return instance.getCurrentNodeId();
        } else if ("end".equalsIgnoreCase(nextNode.getType())) {
            instance.setOutcome("success");
            instance.setStatus("completed");
            instance.setCompletedAt(OffsetDateTime.now());
            instanceRepo.save(instance);
            auditRepo.save(WorkflowAuditLog.builder()
                    .workflowInstance(instance)
                    .action("workflow_completed")
                    .performedBy(performedBy)
                    .performedByName(performedByName)
                    .remarks("Completed")
                    .build());
        } else if ("subworkflow".equalsIgnoreCase(nextNode.getType())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,"Subworkflow nodes are not yet supported at runtime");
        }
        return nextNode.getId();
    }

    public void processNextNode(WorkflowInstance instance, WorkflowDefinitionStructure structure,
            String nextNodeId, String performedBy, String performedByName, String fromNodeId, String actionTaken) {

        Map<String, WorkflowNode> nodeMap = buildNodeMap(structure);
        Map<String, List<WorkflowConnection>> connMap = buildConnectionMap(structure);

        WorkflowNode nextNode = Optional.ofNullable(nodeMap.get(nextNodeId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
                        "Target node '" + nextNodeId + "' not found in definition"));

        instance.setCurrentNodeId(nextNodeId);
        recordTransitionHistory(instance, fromNodeId, nextNodeId, "auto", performedBy, "Transition due to action: " + actionTaken);

        if ("conditional".equalsIgnoreCase(nextNode.getType())) {
            handleConditionalNode(instance, structure, connMap, nextNode, performedBy, performedByName);
        } else if ("end".equalsIgnoreCase(nextNode.getType())) {
            instance.setStatus("completed");
            instance.setCompletedAt(OffsetDateTime.now());
            instance.setOutcome(
                    actionTaken != null && actionTaken.toLowerCase().contains("reject") ? "failure" : "success");
            instanceRepo.save(instance);
            auditRepo.save(WorkflowAuditLog.builder()
                    .workflowInstance(instance)
                    .action("workflow_completed")
                    .performedBy(performedBy)
                    .performedByName(performedByName)
                    .remarks("Workflow Completed")
                    .build());
        } else if ("approval".equalsIgnoreCase(nextNode.getType())) {
            List<WorkflowTask> tasks = createTasksForApprovalNode(instance, nextNode);
            String label = nextNode.getConfig() != null ? nextNode.getConfig().getLabel() : nextNodeId;
            auditRepo.save(WorkflowAuditLog.builder()
                    .workflowInstance(instance)
                    .action("task_created")
                    .performedBy(performedBy)
                    .performedByName(performedByName)
                    .nodeLabel(label)
                    .contextData(slaContextData(tasks))
                    .remarks(String.format("Created %d task(s) for '%s'", tasks.size(), nextNodeId))
                    .build());
            instanceRepo.save(instance);
        } else if ("start".equalsIgnoreCase(nextNode.getType())) {
            WorkflowTask task = WorkflowTask.builder()
                    .workflowInstance(instance)
                    .nodeId(nextNode.getId())
                    .assignmentType("USER")
                    .assignmentValue(instance.getCreatedBy())
                    .resolvedAssignedTo(instance.getCreatedBy())
                    .status("pending")
                    .build();
            taskRepo.save(task);
            auditRepo.save(WorkflowAuditLog.builder()
                    .workflowInstance(instance)
                    .action("sent_back_to_start")
                    .performedBy(performedBy)
                    .performedByName(performedByName)
                    .remarks("Application sent back to start node for revision")
                    .build());
            instanceRepo.save(instance);
        } else if ("subworkflow".equalsIgnoreCase(nextNode.getType())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,"Subworkflow nodes are not yet supported at runtime");
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────────

    private List<WorkflowTask> createTasksForApprovalNode(WorkflowInstance instance, WorkflowNode node) {
        List<WorkflowTask> tasks = new ArrayList<>();
        NodeConfig config = node.getConfig();
        String mode = config.getApprovalMode() != null ? config.getApprovalMode() : "single";
        if ("single".equalsIgnoreCase(mode)) {
            tasks.add(createTask(instance, node.getId(), config.getAssignee(), config.getSla()));
        } else if (config.getAssignees() != null) {
            for (Assignee assignee : config.getAssignees()) {
                tasks.add(createTask(instance, node.getId(), assignee, config.getSla()));
            }
        }
        return tasks;
    }

    private WorkflowTask createTask(WorkflowInstance instance, String nodeId, Assignee assignee, SlaConfig slaConfig) {
        OffsetDateTime deadline = slaConfig != null ? slaService.calculateSlaDeadline(slaConfig, OffsetDateTime.now()) : null;
        boolean isRole = "role".equalsIgnoreCase(assignee.getType());
        WorkflowTask task = WorkflowTask.builder()
                .workflowInstance(instance)
                .nodeId(nodeId)
                .assignmentType(assignee.getType() != null ? assignee.getType().toUpperCase() : "USER")
                .assignmentValue(assignee.getValue())
                .resolvedAssignedTo(isRole ? null : assignee.getValue())
                .resolvedAssignedRole(isRole ? assignee.getValue() : null)
                .status("pending")
                .slaDeadline(deadline)
                .slaEscalationType(slaConfig != null ? slaConfig.getEscalationType() : null)
                .allowEdit(true)
                .build();
        return taskRepo.save(task);
    }

    private void handleConditionalNode(WorkflowInstance instance, WorkflowDefinitionStructure structure,
            Map<String, List<WorkflowConnection>> connMap, WorkflowNode conditionalNode,
            String performedBy, String performedByName) {
        log.info("Processing conditional node '{}' for instance {}", conditionalNode.getId(), instance.getId());

        Map<String, Object> conditionData = instance.getVariables() != null
                ? new HashMap<>(instance.getVariables())
                : Collections.emptyMap();

        String nextAction = evaluateConditionalNode(conditionalNode, conditionData);

        WorkflowConnection conn = connMap.getOrDefault(conditionalNode.getId(), Collections.emptyList())
                .stream()
                .filter(c -> nextAction.equalsIgnoreCase(c.getOnAction() != null ? c.getOnAction() : c.getOn()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
                        "No path matched for evaluated condition action: '" + nextAction + "'"));

        auditRepo.save(WorkflowAuditLog.builder()
                .workflowInstance(instance)
                .action("conditional_evaluated")
                .eventType("conditional")
                .sourceNodeId(conditionalNode.getId())
                .targetNodeId(conn.getTo())
                .performedBy(performedBy)
                .performedByName(performedByName)
                .remarks("Conditional evaluated to: " + nextAction)
                .eventStatus("completed")
                .tenantId(instance.getTenantId())
                .build());

        instance.setCurrentNodeId(conn.getTo());
        instanceRepo.save(instance);
        recordTransitionHistory(instance, conditionalNode.getId(), conn.getTo(), "conditional", performedBy,
                "Conditional rule evaluated to: " + nextAction);

        processNextNode(instance, structure, conn.getTo(), performedBy, performedByName, conditionalNode.getId(), nextAction);
    }

    private String evaluateConditionalNode(WorkflowNode node, Map<String, Object> data) {
        if (data == null || data.isEmpty() || node.getConfig().getRules() == null) {
            return node.getConfig().getDefaultAction();
        }
        for (ConditionalRule rule : node.getConfig().getRules()) {
            if (rule.getConditions() == null || rule.getConditions().isEmpty()) continue;
            if (evaluateRule(rule, data)) {
                return rule.getNextAction();
            }
        }
        return node.getConfig().getDefaultAction();
    }

    private boolean evaluateRule(ConditionalRule rule, Map<String, Object> data) {
        var conditions = rule.getConditions();
        var operators  = rule.getOperators();
        boolean result = evalCondition(conditions.get(0), data);
        for (int i = 1; i < conditions.size(); i++) {
            String op = (operators != null && operators.size() >= i) ? operators.get(i - 1) : "AND";
            boolean next = evalCondition(conditions.get(i), data);
            result = "OR".equalsIgnoreCase(op) ? result || next : result && next;
        }
        return result;
    }

    private boolean evalCondition(com.sttl.workflow.definition.dto.node.ConditionalRule.RuleCondition cond, Map<String, Object> data) {
        Object val = data.get(cond.getKey());
        if (val == null) return false;
        String actual   = val.toString();
        String expected = cond.getValue() != null ? cond.getValue().toString() : "";
        return evaluateCondition(actual, cond.getOperator(), expected);
    }

    private boolean evaluateCondition(String actual, String op, String expected) {
        if (op == null) return false;
        return switch (op.toLowerCase()) {
            case "!=" -> !actual.equalsIgnoreCase(expected);
            case ">" -> compareNumeric(actual, expected) > 0;
            case "<" -> compareNumeric(actual, expected) < 0;
            case "contains" -> actual.toLowerCase().contains(expected.toLowerCase());
            case "is_empty" -> actual.trim().isEmpty();
            case "is_not_empty" -> !actual.trim().isEmpty();
            default -> actual.equalsIgnoreCase(expected);
        };
    }

    private int compareNumeric(String actual, String expected) {
        try {
            return new BigDecimal(actual).compareTo(new BigDecimal(expected));
        } catch (Exception e) {
            return actual.compareTo(expected);
        }
    }

    private Map<String, WorkflowNode> buildNodeMap(WorkflowDefinitionStructure structure) {
        return structure.getNodes().stream()
                .collect(Collectors.toMap(WorkflowNode::getId, java.util.function.Function.identity()));
    }

    private Map<String, List<WorkflowConnection>> buildConnectionMap(WorkflowDefinitionStructure structure) {
        return structure.getConnections().stream()
                .collect(Collectors.groupingBy(WorkflowConnection::getFrom));
    }

    private Map<String, Object> slaContextData(List<WorkflowTask> tasks) {
        if (tasks.isEmpty()) return new HashMap<>();
        OffsetDateTime deadline = tasks.get(0).getSlaDeadline();
        if (deadline == null) return new HashMap<>();
        Map<String, Object> ctx = new HashMap<>();
        ctx.put("slaDeadline", deadline.toString());
        return ctx;
    }

    private void recordTransitionHistory(WorkflowInstance instance, String fromNodeId, String toNodeId,
            String transitionType, String performedBy, String reason) {
        transitionHistoryRepo.save(WorkflowTransitionHistory.builder()
                .workflowInstance(instance)
                .fromNodeId(fromNodeId)
                .toNodeId(toNodeId)
                .transitionType(transitionType)
                .performedBy(performedBy)
                .reason(reason)
                .tenantId(instance.getTenantId())
                .build());
    }
}
