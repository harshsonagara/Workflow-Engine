package com.sttl.workflow.mapping.controller;

import com.sttl.workflow.common.dto.ApiResponse;
import com.sttl.workflow.mapping.dto.ProcessDto;
import com.sttl.workflow.mapping.dto.RoleRegistryDto;
import com.sttl.workflow.mapping.service.impl.MappingServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/mappings", "/workflow-engine-api/mappings"})
public class  MappingController {

    private final MappingServiceImpl mappingService;

    public MappingController(MappingServiceImpl mappingService) {
        this.mappingService = mappingService;
    }

    // ── Process Mappings ──────────────────────────────────────────────────────

    @GetMapping("/processes")
    public ResponseEntity<ApiResponse<List<ProcessDto>>> getProcesses() {
        return ResponseEntity.ok(ApiResponse.success("Processes retrieved successfully", mappingService.getAllProcesses()));
    }

    @PostMapping("/processes")
    public ResponseEntity<ApiResponse<ProcessDto>> createProcess(@RequestBody ProcessDto processDto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Process created successfully", mappingService.createProcess(processDto)));
    }

    @PatchMapping("/processes/{processId}/config")
    public ResponseEntity<ApiResponse<ProcessDto>> updateProcessConfig(@PathVariable Long processId, @RequestBody Map<String, Object> patch) {
        return ResponseEntity.ok(ApiResponse.success("Process config updated successfully", mappingService.updateProcessConfig(processId, patch)));
    }

    @DeleteMapping("/processes/{processId}")
    public ResponseEntity<ApiResponse<Void>> deleteProcess(@PathVariable Long processId) {
        mappingService.deleteProcess(processId);
        return ResponseEntity.ok(ApiResponse.success("Process deleted successfully", null));
    }

    // ── Roles Registry ────────────────────────────────────────────────────────

    /**
     * GET /mappings/roles
     * Returns all assignable roles and users aggregated from:
     * 1. The role_registry table (external apps' synced roles)
     * 2. All active process mappings' assignmentConfig
     * 3. All active workflow version definitions (scanned assignee values)
     *
     * Used by the Workflow Designer to populate assignment dropdowns dynamically.
     */
    @GetMapping("/roles")
    public ResponseEntity<ApiResponse<List<RoleRegistryDto.RoleEntry>>> getRoles() {
        List<RoleRegistryDto.RoleEntry> roles = mappingService.getRoles();
        return ResponseEntity.ok(ApiResponse.success("Roles retrieved successfully", roles));
    }

    /**
     * POST /mappings/roles/sync
     * Third-party applications call this endpoint to register their roles/users
     * so the Workflow Designer can show them in assignment dropdowns.
     *
     * Calling this replaces all previous entries from the same source.
     * If source is not provided or is blank, "DEFAULT" will be used.
     */
    @DeleteMapping("/roles/entry/{roleId}")
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable String roleId) {
        mappingService.deleteRole(roleId);
        return ResponseEntity.ok(ApiResponse.success("Role deleted successfully", null));
    }

    @PostMapping("/roles/sync")
    public ResponseEntity<ApiResponse<Void>> syncRoles(@RequestBody RoleRegistryDto dto) {
        mappingService.syncRoles(dto);
        String source = (dto.getSource() == null || dto.getSource().isBlank())
                ? "DEFAULT"
                : dto.getSource();
        return ResponseEntity.ok(ApiResponse.success(
                "Roles synced successfully for source '" + source + "'", null));
    }

}
