package com.sttl.workflow.definition.service.impl;

import com.sttl.workflow.definition.dto.WorkflowValidationResult;
import com.sttl.workflow.definition.dto.master.CreateWorkflowMasterRequest;
import com.sttl.workflow.definition.dto.version.ActiveVersionSummaryDto;
import com.sttl.workflow.definition.dto.version.CreateVersionRequest;
import com.sttl.workflow.definition.dto.version.WorkflowVersionDto;
import com.sttl.workflow.definition.dto.workflow.WorkflowDefinitionDto;
import com.sttl.workflow.definition.dto.workflow.WorkflowDropdownDto;
import com.sttl.workflow.definition.dto.workflow.WorkflowMasterWithActiveVersionDto;
import com.sttl.workflow.definition.dto.workflow.WorkflowMasterWithVersionsDto;
import com.sttl.workflow.definition.entity.WorkflowMaster;
import com.sttl.workflow.definition.repository.WorkflowMasterRepository;
import com.sttl.workflow.mapping.repository.ProcessMappingRepository;
import com.sttl.workflow.service.impl.WorkflowValidationServiceImpl;
import com.sttl.workflow.version.entity.WorkflowVersion;
import com.sttl.workflow.version.repository.WorkflowVersionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class WorkflowDefinitionServiceImpl {

    private final WorkflowMasterRepository workflowMasterRepository;
    private final WorkflowVersionRepository workflowVersionRepository;
    private final WorkflowValidationServiceImpl workflowValidationService;
    private final ProcessMappingRepository processMappingRepository;

    public WorkflowDefinitionServiceImpl(
            WorkflowMasterRepository workflowMasterRepository,
            WorkflowVersionRepository workflowVersionRepository,
            WorkflowValidationServiceImpl workflowValidationService,
            ProcessMappingRepository processMappingRepository
    ) {
        this.workflowMasterRepository = workflowMasterRepository;
        this.workflowVersionRepository = workflowVersionRepository;
        this.workflowValidationService = workflowValidationService;
        this.processMappingRepository = processMappingRepository;
    }

    @Transactional(readOnly = true)
    public WorkflowDefinitionDto getWorkflowDefinition(Long id) {
        return workflowVersionRepository.findByIdAndIsDeletedFalse(id)
                .map(WorkflowDefinitionServiceImpl::toDefinitionDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workflow definition not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<WorkflowMasterWithActiveVersionDto> getAllWorkflowMastersWithActiveVersion() {
        return workflowMasterRepository.findAllWorkflowMastersWithActiveVersion().stream()
                .map(m -> {
                    WorkflowVersion active = m.getWorkflowVersions().stream()
                            .filter(v -> v.isActive() && !v.isDeleted())
                            .findFirst().orElse(null);
                    return WorkflowMasterWithActiveVersionDto.builder()
                            .id(m.getId())
                            .workflowName(m.getWorkflowName())
                            .code(m.getCode())
                            .isActive(m.isActive())
                            .createdAt(m.getCreatedAt())
                            .activeVersion(active == null ? null : ActiveVersionSummaryDto.builder()
                                    .id(active.getId())
                                    .versionName(active.getVersionName())
                                    .isActive(active.isActive())
                                    .createdAt(active.getCreatedAt())
                                    .build())
                            .build();
                }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkflowMasterWithVersionsDto> getWorkflowMasterAndVersions(Long id) {
        List<WorkflowMaster> masters = (id != null)
                ? List.of(workflowMasterRepository.findByIdAndIsDeletedFalse(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workflow master not found: " + id)))
                : workflowMasterRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc();
        return masters.stream().map(m -> WorkflowMasterWithVersionsDto.builder()
                .id(m.getId())
                .workflowName(m.getWorkflowName())
                .isActive(m.isActive())
                .isDeleted(m.isDeleted())
                .createdAt(m.getCreatedAt())
                .updatedAt(m.getUpdatedAt())
                .workflowVersions(m.getWorkflowVersions().stream()
                        .filter(v -> !v.isDeleted())
                        .map(WorkflowDefinitionServiceImpl::toVersionDto)
                        .collect(Collectors.toList()))
                .build()).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkflowDropdownDto> getAllWorkflowNames() {
        return workflowMasterRepository.findAllNamesOrderByCreatedAtDesc();
    }

    public WorkflowValidationResult validateWorkflowDefinition(String definitionJson) {
        return workflowValidationService.validateWorkflowDefinition(definitionJson);
    }

    public WorkflowVersionDto createWorkflowMaster(CreateWorkflowMasterRequest request, Integer userId) {
        WorkflowValidationResult validation = workflowValidationService.validateWorkflowDefinition(request.getDefinitionJson());
        if (!validation.isValid()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "Invalid definition: " + String.join(", ", validation.getErrors()));
        }
        if (workflowMasterRepository.findByWorkflowNameAndIsDeletedFalse(request.getWorkflowName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A workflow with the name '" + request.getWorkflowName() + "' already exists.");
        }
        String code = generateCode(request.getWorkflowName());
        if (code.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "Could not generate a valid code from name: '" + request.getWorkflowName() + "'");
        }
        if (workflowMasterRepository.findByCodeAndTenantIdAndIsDeletedFalse(code, request.getTenantId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A workflow with code '" + code + "' already exists in your tenant.");
        }
        WorkflowMaster savedMaster = workflowMasterRepository.save(WorkflowMaster.builder()
                .workflowName(request.getWorkflowName())
                .code(code)
                .tenantId(request.getTenantId())
                .isActive(request.isActive())
                .createdBy(String.valueOf(userId))
                .updatedBy(String.valueOf(userId))
                .build());
        WorkflowVersion savedVersion = workflowVersionRepository.save(WorkflowVersion.builder()
                .workflowMaster(savedMaster)
                .versionName(request.getVersionName())
                .definitionJson(request.getDefinitionJson())
                .isActive(true)
                .createdBy(userId)
                .updatedBy(userId)
                .build());
        return toVersionDto(savedVersion);
    }

    public WorkflowVersionDto createNewVersion(CreateVersionRequest request, Integer userId) {
        if (request.getVersionName() == null || request.getVersionName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "Version name is required");
        }
        WorkflowMaster master = workflowMasterRepository.findByWorkflowNameAndIsDeletedFalse(request.getWorkflowName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workflow not found: " + request.getWorkflowName()));
        boolean duplicate = workflowVersionRepository.findAllByWorkflowMasterIdAndIsDeletedFalse(master.getId())
                .stream().anyMatch(v -> request.getVersionName().equalsIgnoreCase(v.getVersionName()));
        if (duplicate) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Version '" + request.getVersionName() + "' already exists for workflow '" + request.getWorkflowName() + "'");
        }
        if (request.isActive()) {
            workflowVersionRepository.deactivateOtherVersions(master.getId(), 0L);
        }
        WorkflowVersion saved = workflowVersionRepository.save(WorkflowVersion.builder()
                .workflowMaster(master)
                .versionName(request.getVersionName())
                .definitionJson(request.getDefinitionJson())
                .isActive(request.isActive())
                .createdBy(userId)
                .updatedBy(userId)
                .build());
        return toVersionDto(saved);
    }

    public void activateWorkflowVersion(Long versionId, Integer userId) {
        WorkflowVersion version = workflowVersionRepository.findByIdAndIsDeletedFalse(versionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Version not found: " + versionId));
        workflowVersionRepository.deactivateOtherVersions(version.getWorkflowMaster().getId(), versionId);
        version.setActive(true);
        version.setUpdatedBy(userId);
        workflowVersionRepository.save(version);
    }

    public void deleteWorkflowMaster(Long workflowId, Integer userId) {
        WorkflowMaster master = workflowMasterRepository.findById(workflowId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workflow master not found: " + workflowId));
        if (master.isDeleted()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Workflow is already deleted");

        List<com.sttl.workflow.mapping.entity.ProcessMapping> activeMappings =
                processMappingRepository.findAllByWorkflowMasterIdAndIsActiveTrue(workflowId);
        if (!activeMappings.isEmpty()) {
            String codes = activeMappings.stream()
                    .map(com.sttl.workflow.mapping.entity.ProcessMapping::getProcessCode)
                    .collect(Collectors.joining(", "));
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot delete workflow: it is referenced by active process mapping(s): " + codes + ". Remove or reassign those mappings first.");
        }

        master.setDeleted(true);
        master.setUpdatedBy(String.valueOf(userId));
        workflowMasterRepository.save(master);
    }

    public void deleteWorkflowVersion(Long workflowVersionId, Integer userId) {
        WorkflowVersion version = workflowVersionRepository.findById(workflowVersionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workflow version not found: " + workflowVersionId));
        if (version.isDeleted()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Workflow version is already deleted");
        if (version.isActive()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete an active workflow version. Please activate another version first.");
        version.setDeleted(true);
        version.setUpdatedBy(userId);
        workflowVersionRepository.save(version);
    }

    public boolean toggleWorkflowMasterStatus(Long workflowId, Integer userId) {
        WorkflowMaster master = workflowMasterRepository.findById(workflowId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workflow master not found: " + workflowId));
        if (master.isDeleted()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot toggle status of a deleted workflow");
        boolean newStatus = !master.isActive();
        master.setActive(newStatus);
        master.setUpdatedBy(String.valueOf(userId));
        workflowMasterRepository.save(master);
        return newStatus;
    }

    private String generateCode(String name) {
        String code = name.toUpperCase()
                .replaceAll("[^A-Z0-9_]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "");
        return code.length() > 100 ? code.substring(0, 100) : code;
    }

    private static WorkflowDefinitionDto toDefinitionDto(WorkflowVersion v) {
        return WorkflowDefinitionDto.builder()
                .id(v.getId())
                .workflowName(v.getWorkflowMaster().getWorkflowName())
                .versionName(v.getVersionName())
                .isActive(v.isActive())
                .definitionJson(v.getDefinitionJson())
                .createdAt(v.getCreatedAt())
                .updatedAt(v.getUpdatedAt())
                .build();
    }

    private static WorkflowVersionDto toVersionDto(WorkflowVersion entity) {
        return WorkflowVersionDto.builder()
                .id(entity.getId())
                .workflowMasterId(entity.getWorkflowMaster().getId())
                .versionName(entity.getVersionName())
                .definitionJson(entity.getDefinitionJson())
                .isActive(entity.isActive())
                .isDeleted(entity.isDeleted())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
