package com.sttl.workflow.runtime.service.impl;

import com.sttl.workflow.definition.dto.workflow.WorkflowDefinitionStructure;
import com.sttl.workflow.definition.dto.workflow.WorkflowNode;
import com.sttl.workflow.task.dto.WorkflowTaskDto;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.sttl.workflow.definition.entity.WorkflowMaster;
import com.sttl.workflow.definition.repository.WorkflowMasterRepository;
import com.sttl.workflow.mapping.repository.ProcessMappingRepository;
import com.sttl.workflow.mapping.entity.ProcessMapping;
import com.sttl.workflow.runtime.dto.StartWorkflowRuntimeDto;
import com.sttl.workflow.runtime.dto.WorkflowInstanceDto;
import com.sttl.workflow.runtime.dto.WorkflowRuntimeResponseDto;
import com.sttl.workflow.runtime.entity.WorkflowAuditLog;
import com.sttl.workflow.runtime.entity.WorkflowInstance;
import com.sttl.workflow.runtime.entity.WorkflowTransitionHistory;
import com.sttl.workflow.runtime.repository.WorkflowAuditLogRepository;
import com.sttl.workflow.runtime.repository.WorkflowInstanceRepository;
import com.sttl.workflow.runtime.repository.WorkflowTransitionHistoryRepository;
import com.sttl.workflow.service.WorkflowDefinitionParser;
import com.sttl.workflow.runtime.service.impl.WorkflowStateTransitionServiceImpl;
import com.sttl.workflow.service.impl.WorkflowValidationServiceImpl;
import com.sttl.workflow.version.entity.WorkflowVersion;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@Transactional
public class WorkflowRuntimeServiceImpl {

    private final WorkflowMasterRepository masterRepo;
    private final WorkflowInstanceRepository instanceRepo;
    private final WorkflowAuditLogRepository auditRepo;
    private final WorkflowTransitionHistoryRepository transitionHistoryRepo;
    private final WorkflowValidationServiceImpl validationService;
    private final ProcessMappingRepository processMappingRepository;
    private final WorkflowDefinitionParser definitionParser;
    private final WorkflowStateTransitionServiceImpl stateTransitionService;

    public WorkflowRuntimeServiceImpl(
            WorkflowMasterRepository masterRepo,
            WorkflowInstanceRepository instanceRepo,
            WorkflowAuditLogRepository auditRepo,
            WorkflowTransitionHistoryRepository transitionHistoryRepo,
            WorkflowValidationServiceImpl validationService,
            ProcessMappingRepository processMappingRepository,
            WorkflowDefinitionParser definitionParser,
            WorkflowStateTransitionServiceImpl stateTransitionService
    ){
        this.masterRepo = masterRepo;
        this.instanceRepo = instanceRepo;
        this.auditRepo = auditRepo;
        this.transitionHistoryRepo = transitionHistoryRepo;
        this.validationService = validationService;
        this.processMappingRepository = processMappingRepository;
        this.definitionParser = definitionParser;
        this.stateTransitionService = stateTransitionService;
    }

    public WorkflowRuntimeResponseDto startWorkflowRuntime(StartWorkflowRuntimeDto dto) {
        if (dto.getProcessCode() == null || dto.getProcessCode().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"processCode is required. Register a process mapping at /mappings before calling /start.");
        }

        ProcessMapping processMapping = processMappingRepository
                .findByProcessCodeAndIsActiveTrue(dto.getProcessCode().toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No active process mapping found for code: " + dto.getProcessCode()));

        final String resolvedWorkflowCode = processMapping.getWorkflowMaster().getCode();

        if (dto.getContext() != null && dto.getContext().getEntityType() == null
                && processMapping.getEntityType() != null) {
            dto.getContext().setEntityType(processMapping.getEntityType());
        }

        log.info("Starting workflow runtime for code: '{}'", resolvedWorkflowCode);

        WorkflowMaster master = masterRepo.findByCodeAndIsDeletedFalse(resolvedWorkflowCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No workflow master found for code: '" + resolvedWorkflowCode + "'"));

        WorkflowVersion activeVersion = master.getWorkflowVersions().stream()
                .filter(v -> v.isActive() && !v.isDeleted())
                .findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
                        "No active version found for workflow: '" + resolvedWorkflowCode + "'"));

        var validation = validationService.validateWorkflowDefinition(activeVersion.getDefinitionJson());
        if (!validation.isValid()) {
            String errorDetails = String.join("\n• ", validation.getErrors());
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,"Cannot start workflow. Fix these issues:\n• " + errorDetails);
        }

        WorkflowDefinitionStructure structure = definitionParser.parseVersionJson(
                activeVersion.getId(), activeVersion.getDefinitionJson());

        WorkflowNode startNode = structure.getNodes().stream()
                .filter(n -> "start".equalsIgnoreCase(n.getType()))
                .findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,"No start node in workflow definition"));

        var ctx = dto.getContext() != null ? dto.getContext() : new com.sttl.workflow.runtime.dto.WorkflowContext();

        String tempBusinessKey = (ctx.getBusinessKey() != null && !ctx.getBusinessKey().trim().isEmpty())
            ? ctx.getBusinessKey()
            : "temp-" + System.nanoTime();

        WorkflowInstance instance = WorkflowInstance.builder()
                .workflowVersion(activeVersion)
                .definitionSnapshot(activeVersion.getDefinitionJson())
                .entityType(ctx.getEntityType())
                .entityId(ctx.getEntityId())
                .businessKey(tempBusinessKey)
                .variables(ctx.getVariables() != null ? ctx.getVariables() : new HashMap<>())
                .metadata(ctx.getMetadata() != null ? ctx.getMetadata() : new HashMap<>())
                .currentNodeId(startNode.getId())
                .status("running")
                .createdBy(dto.getInitiatedBy())
                .build();

        WorkflowInstance savedInstance = instanceRepo.save(instance);

        // Only auto-generate when caller did not supply their own key.
        if (ctx.getBusinessKey() == null || ctx.getBusinessKey().trim().isEmpty()) {
            String prefix = processMapping.getBusinessKeyPrefix() != null ? processMapping.getBusinessKeyPrefix() : "WF";
            String sequence = String.format("%06d", savedInstance.getId());
            String year = String.valueOf(java.time.Year.now().getValue());
            savedInstance.setBusinessKey(prefix + "-" + year + "-" + sequence);
        }

        auditRepo.save(WorkflowAuditLog.builder()
                .workflowInstance(savedInstance)
                .action("workflow_started")
                .performedBy(dto.getInitiatedBy())
                .performedByName(dto.getInitiatedByName())
                .remarks("Workflow started for " + ctx.getEntityType() + ":" + ctx.getEntityId())
                .build());

        List<WorkflowTaskDto> createdTasks = new ArrayList<>();
        String nextNodeId = stateTransitionService.progressFromStartNode(savedInstance.getId(), structure, startNode,
                dto.getInitiatedBy(), dto.getInitiatedByName(), createdTasks);

        savedInstance.setCurrentNodeId(nextNodeId);
        instanceRepo.save(savedInstance);

        transitionHistoryRepo.save(WorkflowTransitionHistory.builder()
                .workflowInstance(savedInstance)
                .fromNodeId("start")
                .toNodeId(nextNodeId)
                .transitionType("auto")
                .performedBy(dto.getInitiatedBy())
                .reason("Initial transition from start node")
                .tenantId(savedInstance.getTenantId())
                .build());
        auditRepo.save(WorkflowAuditLog.builder()
                .workflowInstance(savedInstance)
                .action("node_transition")
                .eventType("transition")
                .sourceNodeId("start")
                .targetNodeId(nextNodeId)
                .performedBy(dto.getInitiatedBy())
                .performedByName(dto.getInitiatedByName())
                .remarks("Workflow progressed to " + nextNodeId)
                .eventStatus("completed")
                .tenantId(savedInstance.getTenantId())
                .build());

        Long taskId = !createdTasks.isEmpty() ? createdTasks.get(0).getId() : null;

        return WorkflowRuntimeResponseDto.builder()
                .success(true)
                .workflowInstanceId(savedInstance.getId())
                .taskId(taskId)
                .recordId(savedInstance.getBusinessKey())
                .status(savedInstance.getStatus())
                .currentNodeId(nextNodeId)
                .message("Workflow instance started successfully")
                .build();
    }

    @Transactional(readOnly = true)
    public WorkflowInstanceDto getWorkflowInstance(Long id) {
        return instanceRepo.findById(id).map(this::mapToInstanceDto).orElse(null);
    }

    @Transactional(readOnly = true)
    public WorkflowInstanceDto getWorkflowInstanceByRecordId(String recordId) {
        return instanceRepo.findLatestByBusinessKey(recordId).map(this::mapToInstanceDto).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<WorkflowInstanceDto> getAllWorkflowInstances() {
        return instanceRepo.findAll().stream()
                .map(this::mapToInstanceDto)
                .collect(Collectors.toList());
    }

    // ── Private helpers ──────────────────────────────────────────────────────────

    private WorkflowInstanceDto mapToInstanceDto(WorkflowInstance entity) {
        return WorkflowInstanceDto.builder()
                .id(entity.getId())
                .recordId(entity.getBusinessKey())
                .currentNodeId(entity.getCurrentNodeId())
                .status(entity.getStatus())
                .createdBy(entity.getCreatedBy())
                .createdAt(entity.getCreatedAt())
                .completedAt(entity.getCompletedAt())
                .parentWorkflowInstanceId(entity.getParentWorkflowInstanceId())
                .parentNodeId(entity.getParentNodeId())
                .outcome(entity.getOutcome())
                .workflowVersionId(entity.getWorkflowVersionId())
                .build();
    }
}
