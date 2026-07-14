package com.sttl.workflow.monitoring.service.impl;

import com.sttl.workflow.definition.dto.sla.SlaConfig;
import com.sttl.workflow.definition.dto.workflow.WorkflowDefinitionStructure;
import com.sttl.workflow.definition.dto.workflow.WorkflowNode;
import com.sttl.workflow.monitoring.dto.SlaStatusDto;
import com.sttl.workflow.runtime.dto.ExecuteActionDto;
import com.sttl.workflow.runtime.entity.WorkflowAuditLog;
import com.sttl.workflow.runtime.entity.WorkflowInstance;
import com.sttl.workflow.runtime.repository.WorkflowAuditLogRepository;
import com.sttl.workflow.service.WorkflowDefinitionParser;
import com.sttl.workflow.task.entity.WorkflowTask;
import com.sttl.workflow.task.repository.WorkflowTaskRepository;
import com.sttl.workflow.task.service.impl.WorkflowTaskServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@Transactional
public class SlaProcessingServiceImpl {

    private final WorkflowTaskRepository taskRepository;
    private final WorkflowAuditLogRepository auditLogRepository;
    private final WorkflowDefinitionParser definitionParser;
    // @Lazy on the constructor param breaks the cycle: SlaProcessingServiceImpl ← WorkflowStateTransitionServiceImpl ← WorkflowTaskServiceImpl
    private final WorkflowTaskServiceImpl workflowTaskService;

    public SlaProcessingServiceImpl(
            WorkflowTaskRepository taskRepository,
            WorkflowAuditLogRepository auditLogRepository,
            WorkflowDefinitionParser definitionParser,
            @Lazy WorkflowTaskServiceImpl workflowTaskService
    ) {
        this.taskRepository = taskRepository;
        this.auditLogRepository = auditLogRepository;
        this.definitionParser = definitionParser;
        this.workflowTaskService = workflowTaskService;
    }

    public OffsetDateTime calculateSlaDeadline(SlaConfig slaConfig, OffsetDateTime createdAt) {
        if (slaConfig == null || slaConfig.getUnit() == null || createdAt == null) {
            return null;
        }

        int duration = slaConfig.getDuration();
        String unit = slaConfig.getUnit().toLowerCase();

        return switch (unit) {
            case "minutes" -> createdAt.plusMinutes(duration);
            case "hours" -> createdAt.plusHours(duration);
            case "days" -> createdAt.plusDays(duration);
            default -> null;
        };
    }

    public SlaStatusDto getSlaStatus(WorkflowTask task) {
        if (task == null || task.getSlaDeadline() == null) {
            return null;
        }

        OffsetDateTime now = OffsetDateTime.now();
        boolean isBreached = task.isSlaBreached() || now.isAfter(task.getSlaDeadline());

        String breachedDuration = null;
        String warningMessage = null;

        if (isBreached && task.getSlaBreachedAt() != null) {
            Duration breachSpan = Duration.between(task.getSlaBreachedAt(), now);
            breachedDuration = formatDuration(breachSpan);
        }

        if (task.isEscalated() && "escalate_to_role".equalsIgnoreCase(task.getSlaEscalationType())) {
            warningMessage = "SLA exceeded. Task has been escalated to another role.";
        } else if (isBreached && "keep_with_warning".equalsIgnoreCase(task.getSlaEscalationType())) {
            Duration breachSpan = Duration.between(task.getSlaDeadline(), now);
            warningMessage = "SLA breached by " + formatDuration(breachSpan) + ". Please take action immediately.";
        } else if (isBreached && "move_to_next_node".equalsIgnoreCase(task.getSlaEscalationType())) {
            warningMessage = "SLA exceeded. Task will be auto-actioned and moved to next step.";
        }

        return SlaStatusDto.builder()
                .deadline(task.getSlaDeadline())
                .isBreached(isBreached)
                .breachedAt(task.getSlaBreachedAt())
                .breachedDuration(breachedDuration)
                .escalationType(task.getSlaEscalationType())
                .isEscalated(task.isEscalated())
                .warningMessage(warningMessage)
                .canTakeAction(!task.isEscalated() || !"escalate_to_role".equalsIgnoreCase(task.getSlaEscalationType()))
                .originalAssignee(task.getResolvedAssignedRole() != null ? task.getResolvedAssignedRole() : task.getResolvedAssignedTo())
                .build();
    }

    @Scheduled(initialDelay = 30_000, fixedDelayString = "${workflow.sla.check-interval-ms:60000}")
    public void processSlaBreaches() {
        try {
            processSlaBreachesInternal();
        } catch (Exception ex) {
            log.error("Unexpected error during SLA breach processing", ex);
        }
    }

    private void processSlaBreachesInternal() {
        log.info("Starting SLA breach processing");
        OffsetDateTime now = OffsetDateTime.now();
        // TODO: tenant isolation — add tenantId filter once multi-tenant SLA scheduling is enabled
        List<WorkflowTask> breachedTasks = taskRepository.findPendingTasksWithBreachedSla(now);
        log.info("Found {} task(s) with breached SLA", breachedTasks.size());

        // Batch mark breach + collect audit logs — avoids N individual saves
        List<WorkflowTask> tasksToSave = new ArrayList<>();
        List<WorkflowAuditLog> logsToSave = new ArrayList<>();

        for (WorkflowTask task : breachedTasks) {
            if (!task.isSlaBreached()) {
                task.setSlaBreached(true);
                task.setSlaBreachedAt(now);
                tasksToSave.add(task);
                Map<String, Object> ctx = new HashMap<>();
                if (task.getSlaDeadline() != null) ctx.put("slaDeadline", task.getSlaDeadline().toString());
                ctx.put("slaBreachedAt", now.toString());
                logsToSave.add(WorkflowAuditLog.builder()
                        .workflowInstanceId(task.getWorkflowInstanceId())
                        .action("sla_breached")
                        .performedBy("SYSTEM")
                        .nodeLabel(task.getNodeId())
                        .contextData(ctx)
                        .remarks(String.format("SLA breached for task %d at node %s. Escalation: %s",
                                task.getId(), task.getNodeId(), task.getSlaEscalationType()))
                        .build());
            }
        }

        if (!tasksToSave.isEmpty()) {
            taskRepository.saveAll(tasksToSave);
            auditLogRepository.saveAll(logsToSave);
        }

        // Process escalations individually — each has its own complex side effects
        for (WorkflowTask task : breachedTasks) {
            try {
                if ("escalate_to_role".equalsIgnoreCase(task.getSlaEscalationType())) {
                    escalateToRole(task);
                } else if ("move_to_next_node".equalsIgnoreCase(task.getSlaEscalationType())) {
                    moveToNextNode(task);
                } else if ("return_to_previous".equalsIgnoreCase(task.getSlaEscalationType())) {
                    returnToPreviousStep(task);
                }
            } catch (Exception ex) {
                log.error("Error processing SLA escalation for task ID: {}", task.getId(), ex);
            }
        }

        log.info("Finished SLA breach processing");
    }

    private void escalateToRole(WorkflowTask task) {
        if (task.isEscalated()) return;

        // Already JOIN FETCHed by findPendingTasksWithBreachedSla — no extra query
        WorkflowInstance instance = task.getWorkflowInstance();
        if (instance == null || instance.getWorkflowVersion() == null) {
            log.error("Instance or Version not found for task {}", task.getId());
            return;
        }

        try {
            // Use cached parser instead of constructing ObjectMapper locally
            WorkflowDefinitionStructure structure = definitionParser.parseVersionJson(
                    instance.getWorkflowVersionId(),
                    instance.getDefinitionSnapshot());

            WorkflowNode node = structure.getNodes().stream()
                    .filter(n -> n.getId().equals(task.getNodeId()))
                    .findFirst().orElse(null);

            if (node == null || node.getConfig() == null || node.getConfig().getSla() == null
                    || node.getConfig().getSla().getEscalation() == null) {
                log.error("Escalation configuration missing for node {}", task.getNodeId());
                return;
            }

            var escalation = node.getConfig().getSla().getEscalation();
            task.setEscalated(true);

            if ("role".equalsIgnoreCase(escalation.getType())) {
                task.setResolvedAssignedRole(escalation.getValue());
                task.setResolvedAssignedTo(null);
            } else if ("user".equalsIgnoreCase(escalation.getType())) {
                task.setResolvedAssignedTo(escalation.getValue());
                task.setResolvedAssignedRole(null);
            }

            taskRepository.save(task);

            Map<String, Object> ctx = new HashMap<>();
            ctx.put("escalatedTo", escalation.getValue());
            if (task.getSlaDeadline() != null) ctx.put("slaDeadline", task.getSlaDeadline().toString());
            auditLogRepository.save(WorkflowAuditLog.builder()
                    .workflowInstanceId(task.getWorkflowInstanceId())
                    .action("sla_escalated_to_role")
                    .performedBy("SYSTEM")
                    .nodeLabel(task.getNodeId())
                    .contextData(ctx)
                    .remarks("Escalated to " + escalation.getValue() + " due to SLA breach")
                    .build());

        } catch (Exception ex) {
            log.error("Failed to process role escalation for task: {}", task.getId(), ex);
        }
    }

    private void moveToNextNode(WorkflowTask task) {
        log.info("SLA auto-progress triggered for task {}", task.getId());

        WorkflowInstance instance = task.getWorkflowInstance();
        if (instance == null || instance.getWorkflowVersion() == null) {
            log.error("Instance or version not found for task {}", task.getId());
            return;
        }

        String action = null;
        try {
            WorkflowDefinitionStructure structure = definitionParser.parseVersionJson(
                    instance.getWorkflowVersionId(), instance.getDefinitionSnapshot());
            WorkflowNode node = structure.getNodes().stream()
                    .filter(n -> n.getId().equals(task.getNodeId()))
                    .findFirst().orElse(null);
            if (node != null && node.getConfig() != null) {
                String configured = node.getConfig().getSla() != null
                        ? node.getConfig().getSla().getAutoProgressAction() : null;
                if (configured != null && !configured.isBlank()) {
                    action = configured;
                } else if (node.getConfig().getActions() != null && !node.getConfig().getActions().isEmpty()) {
                    action = node.getConfig().getActions().getFirst().getAction();
                    log.info("autoProgressAction not configured for task {}, using first action '{}'", task.getId(), action);
                }
            }
        } catch (Exception ex) {
            log.warn("Could not read autoProgressAction for task {}", task.getId(), ex);
        }
        if (action == null || action.isBlank()) {
            log.error("No action available for SLA auto-progress on task {}. Skipping.", task.getId());
            return;
        }

        List<String> sysRoles = task.getResolvedAssignedRole() != null ? List.of(task.getResolvedAssignedRole()) : Collections.emptyList();
        ExecuteActionDto dto = ExecuteActionDto.builder()
                .taskId(task.getId()).action(action)
                .remarks("Auto-progressed by SYSTEM due to SLA breach")
                .build();
        try {
            workflowTaskService.executeFormScopedAction(dto, "SYSTEM", null, task.getResolvedAssignedRole(), sysRoles);
            log.info("Task {} auto-progressed with action '{}'", task.getId(), action);
        } catch (Exception ex) {
            log.error("Failed to auto-progress task {} with action '{}'", task.getId(), action, ex);
        }
    }

    private void returnToPreviousStep(WorkflowTask task) {
        if (task.isEscalated()) return;
        log.info("SLA return-to-previous triggered for task {}", task.getId());

        List<String> sysRoles = task.getResolvedAssignedRole() != null
                ? List.of(task.getResolvedAssignedRole()) : Collections.emptyList();
        ExecuteActionDto dto = ExecuteActionDto.builder()
                .taskId(task.getId()).action("send_back")
                .remarks("Automatically returned to previous step by SYSTEM due to SLA breach")
                .build();
        try {
            workflowTaskService.executeFormScopedAction(dto, "SYSTEM", null, task.getResolvedAssignedRole(), sysRoles);
            log.info("Task {} returned to previous step", task.getId());
            auditLogRepository.save(WorkflowAuditLog.builder()
                    .workflowInstanceId(task.getWorkflowInstanceId())
                    .action("sla_returned_to_previous")
                    .performedBy("SYSTEM")
                    .remarks("Task automatically returned to previous step due to SLA breach")
                    .build());
        } catch (Exception ex) {
            log.error("Failed to return task {} to previous step — ensure a 'send_back' connection exists on this node", task.getId(), ex);
        }
    }

    private String formatDuration(Duration d) {
        List<String> parts = new ArrayList<>();
        if (d.toDays() > 0)        parts.add(d.toDays()        + " day"    + (d.toDays() > 1 ? "s" : ""));
        if (d.toHoursPart() > 0)   parts.add(d.toHoursPart()   + " hour"   + (d.toHoursPart() > 1 ? "s" : ""));
        if (d.toMinutesPart() > 0) parts.add(d.toMinutesPart() + " minute" + (d.toMinutesPart() > 1 ? "s" : ""));
        return parts.isEmpty() ? "less than a minute" : String.join(" ", parts);
    }

}