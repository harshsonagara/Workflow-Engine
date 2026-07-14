package com.sttl.workflow.mapping.service.impl;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.sttl.workflow.definition.entity.WorkflowMaster;
import com.sttl.workflow.definition.repository.WorkflowMasterRepository;
import com.sttl.workflow.mapping.dto.ProcessDto;
import com.sttl.workflow.mapping.dto.RoleRegistryDto;
import com.sttl.workflow.mapping.entity.ProcessMapping;
import com.sttl.workflow.mapping.entity.RoleRegistry;
import com.sttl.workflow.mapping.repository.ProcessMappingRepository;
import com.sttl.workflow.mapping.repository.RoleRegistryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
@Transactional
public class MappingServiceImpl {

    private final ProcessMappingRepository processMappingRepository;
    private final RoleRegistryRepository roleRegistryRepository;
    private final WorkflowMasterRepository workflowMasterRepository;

    public MappingServiceImpl(
            ProcessMappingRepository processMappingRepository,
                              RoleRegistryRepository roleRegistryRepository,
                              WorkflowMasterRepository workflowMasterRepository
    ) {
        this.processMappingRepository = processMappingRepository;
        this.roleRegistryRepository = roleRegistryRepository;
        this.workflowMasterRepository = workflowMasterRepository;
    }

    @Transactional(readOnly = true)
    public List<ProcessDto> getAllProcesses() {
        return processMappingRepository.findAllByIsActiveTrueOrderByProcessNameAsc()
                .stream().map(MappingServiceImpl::toProcessDto).collect(Collectors.toList());
    }

    public ProcessDto createProcess(ProcessDto dto) {
        if (dto.getWorkflowMasterId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "workflowMasterId is required");
        }
        WorkflowMaster workflowMaster = workflowMasterRepository.findById(dto.getWorkflowMasterId())
                .filter(m -> !m.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workflow not found: " + dto.getWorkflowMasterId()));

        ProcessMapping pm = new ProcessMapping();
        pm.setProcessCode(dto.getProcessCode().toUpperCase());
        pm.setProcessName(dto.getProcessName());
        pm.setDescription(dto.getDescription());
        pm.setWorkflowMaster(workflowMaster);
        pm.setEntityType(dto.getEntityType());
        pm.setBusinessKeyPrefix(dto.getBusinessKeyPrefix());
        pm.setAssignmentConfig(dto.getAssignmentConfig());
        pm.setIsActive(true);
        processMappingRepository.save(pm);
        return toProcessDto(pm);
    }

    public ProcessDto updateProcessConfig(Long processId, Map<String, Object> patch) {
        ProcessMapping pm = processMappingRepository.findById(processId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Process not found: " + processId));

        if (patch.containsKey("processCode")) {
            String newCode = (String) patch.get("processCode");
            if (newCode != null && !newCode.trim().isEmpty()) {
                String normalized = newCode.trim().toUpperCase();
                if (!normalized.equals(pm.getProcessCode()) &&
                        processMappingRepository.findByProcessCodeAndIsActiveTrue(normalized).isPresent()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Process code '" + normalized + "' is already in use");
                }
                pm.setProcessCode(normalized);
            }
        }
        if (patch.containsKey("processName")) {
            String name = (String) patch.get("processName");
            if (name != null && !name.trim().isEmpty()) pm.setProcessName(name);
        }
        if (patch.containsKey("description")) {
            pm.setDescription((String) patch.get("description"));
        }
        if (patch.containsKey("workflowMasterId")) {
            Object val = patch.get("workflowMasterId");
            if (val != null) {
                Long masterId = val instanceof Number ? ((Number) val).longValue() : Long.parseLong(val.toString());
                pm.setWorkflowMaster(workflowMasterRepository.findById(masterId)
                        .filter(m -> !m.isDeleted())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workflow not found: " + masterId)));
            }
        }
        if (patch.containsKey("entityType")) {
            pm.setEntityType((String) patch.get("entityType"));
        }
        if (patch.containsKey("businessKeyPrefix")) {
            pm.setBusinessKeyPrefix((String) patch.get("businessKeyPrefix"));
        }
        if (patch.containsKey("isActive")) {
            Object val = patch.get("isActive");
            if (val instanceof Boolean) pm.setIsActive((Boolean) val);
            else if (val instanceof String) pm.setIsActive(Boolean.parseBoolean((String) val));
        }
        if (patch.containsKey("assignmentConfig")) {
            Object config = patch.get("assignmentConfig");
            if (config == null) {
                pm.setAssignmentConfig(null);
            } else if (config instanceof Map<?, ?> map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> typedMap = (Map<String, Object>) map;
                pm.setAssignmentConfig(typedMap);
            }
        }

        processMappingRepository.save(pm);
        return toProcessDto(pm);
    }

    public void deleteProcess(Long processId) {
        processMappingRepository.deleteById(processId);
    }

    // ── Roles Registry ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<RoleRegistryDto.RoleEntry> getRoles() {
        return new ArrayList<>(roleRegistryRepository.findAllByOrderByTypeAscLabelAsc().stream()
                .collect(Collectors.toMap(
                        RoleRegistry::getRoleId,
                        r -> RoleRegistryDto.RoleEntry.builder()
                                .id(r.getRoleId())
                                .label(r.getLabel() != null ? r.getLabel() : r.getRoleId())
                                .type(r.getType())
                                .build(),
                        (a, b) -> a,
                        LinkedHashMap::new
                ))
                .values());
    }

    public void deleteRole(String roleId) {
        roleRegistryRepository.deleteByRoleId(roleId);
    }

    public void syncRoles(RoleRegistryDto dto) {
        if (dto.getRoles() == null || dto.getRoles().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "roles list must contain at least one entry");
        }
        String source = (dto.getSource() == null || dto.getSource().isBlank())
                ? "DEFAULT"
                : dto.getSource().trim().toUpperCase();
        roleRegistryRepository.deleteBySource(source);
        List<RoleRegistry> entities = dto.getRoles().stream()
                .filter(r -> r.getId() != null && !r.getId().isBlank())
                .map(r -> RoleRegistry.builder()
                        .roleId(r.getId().trim())
                        .label(r.getLabel() != null ? r.getLabel().trim() : r.getId().trim())
                        .type(r.getType() != null ? r.getType().trim() : "role")
                        .source(source)
                        .build())
                .collect(Collectors.toList());
        roleRegistryRepository.saveAll(entities);
    }

    private static ProcessDto toProcessDto(ProcessMapping pm) {
        ProcessDto dto = new ProcessDto();
        dto.setId(pm.getId());
        dto.setProcessCode(pm.getProcessCode());
        dto.setProcessName(pm.getProcessName());
        dto.setDescription(pm.getDescription());
        if (pm.getWorkflowMaster() != null) {
            dto.setWorkflowMasterId(pm.getWorkflowMaster().getId());
        }
        dto.setEntityType(pm.getEntityType());
        dto.setBusinessKeyPrefix(pm.getBusinessKeyPrefix());
        dto.setAssignmentConfig(pm.getAssignmentConfig());
        dto.setIsActive(pm.getIsActive());
        return dto;
    }

}
