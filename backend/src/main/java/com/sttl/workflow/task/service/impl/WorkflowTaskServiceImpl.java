package com.sttl.workflow.task.service.impl;

import com.sttl.workflow.definition.dto.node.ActionDefinitionDto;
import com.sttl.workflow.definition.dto.workflow.WorkflowDefinitionStructure;
import com.sttl.workflow.definition.dto.workflow.WorkflowNode;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.sttl.workflow.task.dto.ActionResolverDto;
import com.sttl.workflow.runtime.dto.ExecuteActionDto;
import com.sttl.workflow.task.dto.FormScopedPendingTaskDto;
import com.sttl.workflow.task.dto.PendingTasksRequestDto;
import com.sttl.workflow.task.dto.WorkflowTaskDto;
import com.sttl.workflow.runtime.entity.WorkflowAuditLog;
import com.sttl.workflow.runtime.entity.WorkflowInstance;
import com.sttl.workflow.task.entity.WorkflowTask;
import com.sttl.workflow.runtime.repository.WorkflowAuditLogRepository;
import com.sttl.workflow.runtime.repository.WorkflowInstanceRepository;
import com.sttl.workflow.task.repository.WorkflowTaskRepository;
import com.sttl.workflow.monitoring.service.impl.SlaProcessingServiceImpl;
import com.sttl.workflow.service.WorkflowDefinitionParser;
import com.sttl.workflow.runtime.service.impl.WorkflowStateTransitionServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * **Implementation of task management service.**
 *
 * Handles task execution, retrieval, and state transitions via delegating
 * to WorkflowStateTransitionService for routing logic.
 */
@Service
@Slf4j
@Transactional
public class WorkflowTaskServiceImpl {

    private final WorkflowTaskRepository taskRepo;
    private final WorkflowInstanceRepository instanceRepo;
    private final WorkflowAuditLogRepository auditRepo;
    private final WorkflowDefinitionParser definitionParser;
    private final SlaProcessingServiceImpl slaService;
    private final WorkflowStateTransitionServiceImpl stateTransitionService;

    public WorkflowTaskServiceImpl(
            WorkflowTaskRepository taskRepo,
            WorkflowInstanceRepository instanceRepo,
            WorkflowAuditLogRepository auditRepo,
            WorkflowDefinitionParser definitionParser,
            SlaProcessingServiceImpl slaService,
            WorkflowStateTransitionServiceImpl stateTransitionService
    ){
        this.taskRepo = taskRepo;
        this.instanceRepo = instanceRepo;
        this.auditRepo = auditRepo;
        this.definitionParser = definitionParser;
        this.slaService = slaService;
        this.stateTransitionService = stateTransitionService;
    }

    @Transactional(readOnly = true)
    public List<WorkflowTaskDto> getPendingTasks(PendingTasksRequestDto request) {
        return taskRepo.findPendingTasks(request.getAssignedTo(), request.getAssignedRole()).stream()
                .map(WorkflowTaskDto::from).collect(Collectors.toList());
    }

    public WorkflowTaskDto executeTaskAction(ExecuteActionDto dto) {
        log.info("Executing task action: {}", dto.getAction());

        WorkflowTask task = taskRepo.findById(dto.getTaskId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Task not found: " + dto.getTaskId()));

        if (!"pending".equalsIgnoreCase(task.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Task " + dto.getTaskId() + " is not in pending state (current: " + task.getStatus() + ")");
        }

        boolean callerMatches = (dto.getRole() != null && dto.getRole().equals(task.getResolvedAssignedRole()))
                || (dto.getPerformedBy() != null && dto.getPerformedBy().equals(task.getResolvedAssignedTo()));
        if (!callerMatches) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to this task");
        }

        WorkflowInstance instance = instanceRepo.findById(task.getWorkflowInstanceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Workflow instance not found: " + task.getWorkflowInstanceId()));

        WorkflowDefinitionStructure structure = definitionParser.parseVersionJson(
                instance.getWorkflowVersionId(),
                instance.getDefinitionSnapshot());

        Map<String, WorkflowNode> nodeMap = buildNodeMap(structure);

        WorkflowNode currentNode = Optional.ofNullable(nodeMap.get(task.getNodeId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
                        "Current node '" + task.getNodeId() + "' not found in definition"));

        List<ActionDefinitionDto> nodeActions = currentNode.getConfig() != null ? currentNode.getConfig().getActions() : null;
        if (nodeActions == null || nodeActions.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
                    "No actions defined for node '" + task.getNodeId() + "'");
        }
        var actionConfig = nodeActions.stream()
                .filter(a -> a.getAction().equalsIgnoreCase(dto.getAction()))
                .findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,"Action '" + dto.getAction() + "' is not allowed at node '" + task.getNodeId() + "'"));

        if (actionConfig.isRemarksMandatory() && (dto.getRemarks() == null || dto.getRemarks().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Remarks are mandatory for action '" + dto.getAction() + "'");
        }

        boolean isRejectAction = dto.getAction().toLowerCase().contains("reject");
        if (isRejectAction
                && Boolean.TRUE.equals(currentNode.getConfig().getRequireRemarksOnReject())
                && (dto.getRemarks() == null || dto.getRemarks().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Remarks are required when rejecting");
        }

        String resultStatus = actionConfig.getResultStatus();
        if (resultStatus == null || resultStatus.trim().isEmpty()) {
            String a = actionConfig.getAction().trim();
            resultStatus = a.isEmpty() ? a : Character.toUpperCase(a.charAt(0)) + a.substring(1).toLowerCase();
        }
        task.setStatus(resultStatus);
        task.setRemarks(dto.getRemarks());
        task.setActedAt(OffsetDateTime.now());
        task.setActionTaken(true);
        taskRepo.save(task);

        auditRepo.save(WorkflowAuditLog.builder()
                .workflowInstance(instance)
                .action("task_" + dto.getAction())
                .performedBy(dto.getPerformedBy())
                .performedByName(dto.getPerformedByName())
                .performedByRole(dto.getRole())
                .nodeLabel(currentNode.getConfig() != null ? currentNode.getConfig().getLabel() : task.getNodeId())
                .remarks(dto.getRemarks())
                .build());

        var conn = structure.getConnections().stream()
                .filter(c -> c.getFrom().equals(task.getNodeId()) &&
                        (dto.getAction().equalsIgnoreCase(c.getOnAction())
                                || dto.getAction().equalsIgnoreCase(c.getOn())))
                .findFirst().orElse(null);

        // Handle parallel approval modes before transitioning
        String approvalMode = currentNode.getConfig().getApprovalMode();
        if (approvalMode != null && !"single".equalsIgnoreCase(approvalMode)) {
            if ("parallel_all".equalsIgnoreCase(approvalMode)) {
                int pendingCount = taskRepo.countByWorkflowInstanceIdAndNodeIdAndStatus(
                        instance.getId(), task.getNodeId(), "pending");
                if (pendingCount > 0) {
                    log.info("parallel_all: {} task(s) still pending at node '{}' — holding transition",
                            pendingCount, task.getNodeId());
                    return WorkflowTaskDto.from(task);
                }
            } else if ("parallel_any".equalsIgnoreCase(approvalMode)) {
                int cancelled = taskRepo.cancelPendingSiblingTasks(instance.getId(), task.getNodeId(), task.getId());
                log.info("parallel_any: cancelled {} sibling task(s) at node '{}'", cancelled, task.getNodeId());
            }
        }

        if (conn != null) {
            stateTransitionService.processNextNode(instance, structure, conn.getTo(), dto.getPerformedBy(), dto.getPerformedByName(), task.getNodeId(), dto.getAction());
        }

        return WorkflowTaskDto.from(task);
    }

    @Transactional(readOnly = true)
    public List<FormScopedPendingTaskDto> getFormScopedPendingTasks(String userId, List<String> userRoles) {
        if ((userId == null) && (userRoles == null || userRoles.isEmpty())) {
            return Collections.emptyList();
        }
        Collection<String> safeRoles = (userRoles == null || userRoles.isEmpty())
                ? Collections.singleton("__NO_ROLE__")
                : userRoles;
        List<WorkflowTask> tasks = taskRepo.findPendingTasksByUserAndRoles(userId, safeRoles);

        List<FormScopedPendingTaskDto> result = new ArrayList<>();
        for (WorkflowTask task : tasks) {
            try {
                WorkflowDefinitionStructure structure = definitionParser.parseVersionJson(
                        task.getWorkflowInstance().getWorkflowVersionId(),
                        task.getWorkflowInstance().getDefinitionSnapshot());
                WorkflowNode node = buildNodeMap(structure).get(task.getNodeId());

                result.add(FormScopedPendingTaskDto.builder()
                        .taskId(task.getId())
                        .instanceId(task.getWorkflowInstanceId())
                        .recordId(task.getWorkflowInstance().getBusinessKey())
                        .workflowName(task.getWorkflowInstance().getWorkflowVersion().getWorkflowMaster().getWorkflowName())
                        .createdAt(task.getCreatedAt())
                        .nodeLabel(node != null ? node.getConfig().getLabel() : task.getNodeId())
                        .slaStatus(slaService.getSlaStatus(task))
                        .allowEdit(task.getAllowEdit())
                        .build());
            } catch (Exception e) {
                log.warn("Failed to build form scoped pending task DTO for task {} — task omitted from response", task.getId(), e);
            }
        }
        return result;
    }

    @Transactional(readOnly = true)
    public ActionResolverDto getFormScopedActions(String recordId, String userId, List<String> userRoles) {
        try {
            String roleFilter = userRoles != null && !userRoles.isEmpty() ? userRoles.getFirst() : null;

            WorkflowInstance instance = instanceRepo.findActiveInstanceByBusinessKey(recordId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"No task found for this record"));

            WorkflowTask task = taskRepo.findPendingTaskByInstanceId(instance.getId(), userId, roleFilter)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"No task found for this record"));

            WorkflowDefinitionStructure structure = definitionParser.parseVersionJson(
                    instance.getWorkflowVersionId(),
                    instance.getDefinitionSnapshot());

            WorkflowNode node = Optional.ofNullable(buildNodeMap(structure).get(task.getNodeId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,"No task found for this record"));

            List<ActionDefinitionDto> actions = node.getConfig().getActions();

            return ActionResolverDto.builder()
                    .taskId(task.getId())
                    .instanceId(instance.getId())
                    .recordId(instance.getBusinessKey())
                    .workflowName(instance.getWorkflowVersion().getWorkflowMaster().getWorkflowName())
                    .currentNodeId(node.getId())
                    .currentNodeLabel(node.getConfig().getLabel())
                    .availableActions(actions)
                    .status(instance.getStatus())
                    .slaStatus(slaService.getSlaStatus(task))
                    .allowEdit(task.getAllowEdit())
                    .build();

        } catch (ResponseStatusException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No task found for this record");
        } catch (Exception e) {
            log.warn("Error resolving actions for recordId: {}", recordId, e);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"No task found for this record");
        }
    }

    public WorkflowTaskDto executeFormScopedAction(ExecuteActionDto dto, String performedBy, String performedByName, String roleCode, List<String> userRoles) {
        // Verify the caller's role matches the task's assigned role before executing
        WorkflowTask task = taskRepo.findById(dto.getTaskId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found: " + dto.getTaskId()));

        boolean roleMatches = (roleCode != null && roleCode.equals(task.getResolvedAssignedRole()))
                || (performedBy != null && performedBy.equals(task.getResolvedAssignedTo()));
        if (!roleMatches) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You are not assigned to this task");
        }

        // Verify taskId actually belongs to the recordId the caller thinks they're acting on
        if (dto.getRecordId() != null) {
            String actualRecordId = task.getWorkflowInstance() != null
                    ? task.getWorkflowInstance().getBusinessKey() : null;
            if (!dto.getRecordId().equalsIgnoreCase(actualRecordId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Task " + dto.getTaskId() + " does not belong to record '" + dto.getRecordId() + "'");
            }
        }

        ExecuteActionDto taskAction = ExecuteActionDto.builder()
                .taskId(dto.getTaskId())
                .recordId(dto.getRecordId())
                .action(dto.getAction())
                .remarks(dto.getRemarks())
                .performedBy(performedBy != null ? performedBy : dto.getPerformedBy())
                .performedByName(performedByName != null ? performedByName : dto.getPerformedByName())
                .role(roleCode)
                .build();
        return executeTaskAction(taskAction);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════════════

    private Map<String, WorkflowNode> buildNodeMap(WorkflowDefinitionStructure structure) {
        return structure.getNodes().stream()
                .collect(Collectors.toMap(WorkflowNode::getId, java.util.function.Function.identity()));
    }

}
