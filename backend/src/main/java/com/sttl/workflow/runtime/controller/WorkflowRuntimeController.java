package com.sttl.workflow.runtime.controller;

import com.sttl.workflow.common.dto.ApiResponse;
import com.sttl.workflow.definition.dto.workflow.WorkflowDropdownDto;
import com.sttl.workflow.definition.service.impl.WorkflowDefinitionServiceImpl;
import com.sttl.workflow.query.dto.ApplicationHistoryDto;
import com.sttl.workflow.query.dto.MySubmissionDto;
import com.sttl.workflow.query.dto.WorkflowDashboardStatsResult;
import com.sttl.workflow.query.service.impl.WorkflowQueryServiceImpl;
import com.sttl.workflow.runtime.dto.ExecuteActionDto;
import com.sttl.workflow.runtime.dto.StartWorkflowRuntimeDto;
import com.sttl.workflow.runtime.dto.WorkflowInstanceDto;
import com.sttl.workflow.runtime.dto.WorkflowRuntimeResponseDto;
import com.sttl.workflow.runtime.service.impl.WorkflowRuntimeServiceImpl;
import com.sttl.workflow.security.ClaimsAccessor;
import com.sttl.workflow.task.dto.ActionResolverDto;
import com.sttl.workflow.task.dto.FormScopedPendingTaskDto;
import com.sttl.workflow.task.dto.PendingTasksRequestDto;
import com.sttl.workflow.task.dto.WorkflowTaskDto;
import com.sttl.workflow.task.service.impl.WorkflowTaskServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.sttl.workflow.definition.dto.node.ActionDefinitionDto;
import com.sttl.workflow.definition.dto.node.ActionPresetAdminDto;
import com.sttl.workflow.definition.dto.node.ActionPresetPatchDto;
import com.sttl.workflow.definition.entity.ActionPreset;
import com.sttl.workflow.definition.repository.ActionPresetRepository;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/workflow-engine-api/workflow-runtime")
@Tag(name = "Workflow Runtime", description = "Workflow Instance execution, task updates, and history tracking")
public class WorkflowRuntimeController {

    private final WorkflowDefinitionServiceImpl definitionService;
    private final WorkflowRuntimeServiceImpl runtimeService;
    private final WorkflowTaskServiceImpl taskService;
    private final WorkflowQueryServiceImpl queryService;
    private final ClaimsAccessor claimsAccessor;
    private final ActionPresetRepository actionPresetRepository;

    public WorkflowRuntimeController(
            WorkflowDefinitionServiceImpl definitionService,
            WorkflowRuntimeServiceImpl runtimeService,
            WorkflowTaskServiceImpl taskService,
            WorkflowQueryServiceImpl queryService,
            ClaimsAccessor claimsAccessor,
            ActionPresetRepository actionPresetRepository
    ){
        this.definitionService = definitionService;
        this.runtimeService = runtimeService;
        this.taskService = taskService;
        this.queryService = queryService;
        this.claimsAccessor = claimsAccessor;
        this.actionPresetRepository = actionPresetRepository;
    }

    @GetMapping("/dropdown")
    @Operation(summary = "Get workflow dropdown mapping for form builders")
    public ResponseEntity<ApiResponse<List<WorkflowDropdownDto>>> getWorkflowDropdown() {
        List<WorkflowDropdownDto> result = definitionService.getAllWorkflowNames();
        return ResponseEntity.ok(ApiResponse.success("Workflow dropdown retrieved successfully", result));
    }

    @GetMapping("/action-presets")
    @Operation(summary = "Active action presets for the workflow designer's approval nodes")
    public ResponseEntity<ApiResponse<List<ActionDefinitionDto>>> getActionPresets() {
        List<ActionDefinitionDto> presets = actionPresetRepository.findByIsActiveTrueOrderBySortOrderAsc()
            .stream()
            .map(p -> ActionDefinitionDto.builder()
                .action(p.getAction())
                .label(p.getLabel())
                .resultStatus(p.getResultStatus())
                .requiresRemarks(p.isRequiresRemarks())
                .remarksMandatory(p.isRemarksMandatory())
                .predefinedReasons(List.of())
                .build())
            .toList();
        return ResponseEntity.ok(ApiResponse.success("Action presets retrieved", presets));
    }

    @PostMapping("/action-presets")
    @Operation(summary = "Create a new action preset")
    public ResponseEntity<ApiResponse<ActionPresetAdminDto>> createActionPreset(@RequestBody ActionPresetPatchDto dto) {
        ActionPreset p = new ActionPreset();
        p.setAction(dto.getLabel() != null ? dto.getLabel().toLowerCase().replace(" ", "_") : "new_action");
        if (dto.getLabel()            != null) p.setLabel(dto.getLabel());
        if (dto.getResultStatus()     != null) p.setResultStatus(dto.getResultStatus());
        if (dto.getRequiresRemarks()  != null) p.setRequiresRemarks(dto.getRequiresRemarks());
        if (dto.getRemarksMandatory() != null) p.setRemarksMandatory(dto.getRemarksMandatory());
        if (dto.getSortOrder()        != null) p.setSortOrder(dto.getSortOrder());
        p.setActive(dto.getActive() != null ? dto.getActive() : true);
        ActionPreset saved = actionPresetRepository.save(p);
        ActionPresetAdminDto result = ActionPresetAdminDto.builder()
            .id(saved.getId()).action(saved.getAction()).label(saved.getLabel())
            .resultStatus(saved.getResultStatus()).requiresRemarks(saved.isRequiresRemarks())
            .remarksMandatory(saved.isRemarksMandatory()).sortOrder(saved.getSortOrder())
            .active(saved.isActive()).build();
        return ResponseEntity.ok(ApiResponse.success("Preset created", result));
    }

    @GetMapping("/action-presets/all")
    @Operation(summary = "All action presets including inactive — for admin management")
    public ResponseEntity<ApiResponse<List<ActionPresetAdminDto>>> getAllActionPresets() {
        List<ActionPresetAdminDto> presets = actionPresetRepository.findAll().stream()
            .sorted(java.util.Comparator.comparingInt(ActionPreset::getSortOrder))
            .map(p -> ActionPresetAdminDto.builder()
                .id(p.getId())
                .action(p.getAction())
                .label(p.getLabel())
                .resultStatus(p.getResultStatus())
                .requiresRemarks(p.isRequiresRemarks())
                .remarksMandatory(p.isRemarksMandatory())
                .sortOrder(p.getSortOrder())
                .active(p.isActive())
                .build())
            .toList();
        return ResponseEntity.ok(ApiResponse.success("All action presets retrieved", presets));
    }

    @PatchMapping("/action-presets/{id}")
    @Operation(summary = "Update an action preset — label, resultStatus, flags, sort order, active")
    public ResponseEntity<ApiResponse<ActionPresetAdminDto>> updateActionPreset(
            @PathVariable Long id,
            @RequestBody ActionPresetPatchDto patch) {
        ActionPreset p = actionPresetRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Action preset not found: " + id));
        if (patch.getLabel()            != null) p.setLabel(patch.getLabel());
        if (patch.getResultStatus()     != null) p.setResultStatus(patch.getResultStatus());
        if (patch.getRequiresRemarks()  != null) p.setRequiresRemarks(patch.getRequiresRemarks());
        if (patch.getRemarksMandatory() != null) p.setRemarksMandatory(patch.getRemarksMandatory());
        if (patch.getSortOrder()        != null) p.setSortOrder(patch.getSortOrder());
        if (patch.getActive()           != null) p.setActive(patch.getActive());
        ActionPreset saved = actionPresetRepository.save(p);
        ActionPresetAdminDto dto = ActionPresetAdminDto.builder()
            .id(saved.getId()).action(saved.getAction()).label(saved.getLabel())
            .resultStatus(saved.getResultStatus()).requiresRemarks(saved.isRequiresRemarks())
            .remarksMandatory(saved.isRemarksMandatory()).sortOrder(saved.getSortOrder())
            .active(saved.isActive()).build();
        return ResponseEntity.ok(ApiResponse.success("Preset updated", dto));
    }

    @PostMapping("/start")
    @Operation(summary = "Start workflow runtime execution")
    public ResponseEntity<ApiResponse<WorkflowRuntimeResponseDto>> startWorkflow(@RequestBody StartWorkflowRuntimeDto dto) {
        WorkflowRuntimeResponseDto result = runtimeService.startWorkflowRuntime(dto);
        return ResponseEntity.ok(ApiResponse.success("Workflow started successfully", result));
    }

    @GetMapping("/instance/{id}")
    @Operation(summary = "Get workflow instance by ID")
    public ResponseEntity<ApiResponse<WorkflowInstanceDto>> getWorkflowInstance(@PathVariable long id) {
        WorkflowInstanceDto result = runtimeService.getWorkflowInstance(id);
        if (result == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.failure("Workflow instance not found"));
        }
        return ResponseEntity.ok(ApiResponse.success("Workflow instance retrieved successfully", result));
    }

    @GetMapping("/instances")
    @Operation(summary = "Get all workflow instances")
    public ResponseEntity<ApiResponse<List<WorkflowInstanceDto>>> getAllWorkflowInstances() {
        List<WorkflowInstanceDto> result = runtimeService.getAllWorkflowInstances();
        return ResponseEntity.ok(ApiResponse.success("Workflow instances retrieved successfully", result));
    }

    @GetMapping("/instance/by-record/{recordId}")
    @Operation(summary = "Get workflow instance by record ID")
    public ResponseEntity<ApiResponse<WorkflowInstanceDto>> getWorkflowInstanceByRecordId(@PathVariable String recordId) {
        WorkflowInstanceDto result = runtimeService.getWorkflowInstanceByRecordId(recordId.toLowerCase());
        if (result == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.failure("No workflow instance found for record '" + recordId + "'"));
        }
        return ResponseEntity.ok(ApiResponse.success("Workflow instance retrieved successfully", result));
    }

    @PostMapping("/tasks/pending")
    @Operation(summary = "Get pending tasks for a user or role")
    public ResponseEntity<ApiResponse<List<WorkflowTaskDto>>> getPendingTasks(@RequestBody PendingTasksRequestDto request) {
        List<WorkflowTaskDto> result = taskService.getPendingTasks(request);
        return ResponseEntity.ok(ApiResponse.success("Pending tasks retrieved successfully", result));
    }

@GetMapping("/dashboard-stats")
    @Operation(summary = "Get workflow dashboard stats: Completed, InProcess, Submitted counts")
    public ResponseEntity<ApiResponse<WorkflowDashboardStatsResult>> getDashboardStats() {
        WorkflowDashboardStatsResult stats = queryService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.success("Dashboard statistics retrieved successfully", stats));
    }

    @GetMapping("/pending-tasks")
    @Operation(summary = "Get form-scoped pending tasks for logged-in user")
    public ResponseEntity<ApiResponse<List<FormScopedPendingTaskDto>>> getFormScopedPendingTasks() {
        String roleCode = claimsAccessor.getRoleCode();
        if (roleCode == null) return missingRole();
        String userId = claimsAccessor.getUserId() != null ? claimsAccessor.getUserId().toString() : null;
        List<FormScopedPendingTaskDto> result = taskService.getFormScopedPendingTasks(userId, List.of(roleCode));
        return ResponseEntity.ok(ApiResponse.success("Form-scoped pending tasks retrieved successfully", result));
    }

    @GetMapping("/actions")
    @Operation(summary = "Get available actions for a specific record")
    public ResponseEntity<ApiResponse<ActionResolverDto>> getFormScopedActions(@RequestParam String recordId) {
        String roleCode = claimsAccessor.getRoleCode();
        if (roleCode == null) return missingRole();
        String userId = claimsAccessor.getUserId() != null ? claimsAccessor.getUserId().toString() : null;
        ActionResolverDto result = taskService.getFormScopedActions(recordId, userId, List.of(roleCode));
        return ResponseEntity.ok(ApiResponse.success("Available actions retrieved successfully", result));
    }

    @PostMapping("/action")
    @Operation(summary = "Execute workflow action with idempotency")
    public ResponseEntity<ApiResponse<WorkflowTaskDto>> executeFormScopedAction(@RequestBody ExecuteActionDto dto) {
        if (dto.getTaskId() == null || dto.getTaskId() <= 0)
            return ResponseEntity.badRequest().body(ApiResponse.failure("taskId is required"));
        if (dto.getAction() == null || dto.getAction().isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.failure("action is required"));
        String roleCode = claimsAccessor.getRoleCode();
        if (roleCode == null) return missingRole();
        String userId = claimsAccessor.getUserId() != null ? claimsAccessor.getUserId().toString() : null;
        String userName = claimsAccessor.getUserName();
        WorkflowTaskDto result = taskService.executeFormScopedAction(dto, userId, userName, roleCode, List.of(roleCode));
        return ResponseEntity.ok(ApiResponse.success("Action '" + dto.getAction() + "' executed successfully", result));
    }

    // ponytail: role enforcement — swap to JWT-only check when auth is fully enabled
    private <T> ResponseEntity<ApiResponse<T>> missingRole() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.failure("Role is required: pass X-Test-Role header or a Bearer JWT with a role claim"));
    }

    @GetMapping("/my-submissions")
    @Operation(summary = "Get submissions created by logged-in user for a specific form")
    public ResponseEntity<ApiResponse<List<MySubmissionDto>>> getMySubmissions() {
        String userId = claimsAccessor.getUserId() != null ? claimsAccessor.getUserId().toString() : null;
        List<MySubmissionDto> result = queryService.getMySubmissions(userId);
        return ResponseEntity.ok(ApiResponse.success("Submissions retrieved successfully", result));
    }

    @GetMapping("/history")
    @Operation(summary = "Get workflow history for a record")
    public ResponseEntity<ApiResponse<List<ApplicationHistoryDto>>> getApplicationHistory(@RequestParam String recordId) {
        List<ApplicationHistoryDto> result = queryService.getApplicationHistory(recordId.toLowerCase());
        return ResponseEntity.ok(ApiResponse.success("Application history retrieved successfully", result));
    }

    @GetMapping("/recent-activities")
    @Operation(summary = "Get 10 most recent system activity logs across all instances")
    public ResponseEntity<ApiResponse<List<ApplicationHistoryDto>>> getRecentActivities() {
        List<ApplicationHistoryDto> result = queryService.getRecentActivities();
        return ResponseEntity.ok(ApiResponse.success("Recent activities retrieved successfully", result));
    }

    @GetMapping("/diagnostic")
    @Operation(summary = "Diagnostic endpoint to debug workflow instance and task status (for troubleshooting)")
    public ResponseEntity<ApiResponse<Map<String, Object>>> diagnoseWorkflow(@RequestParam String recordId) {
        String userId = claimsAccessor.getUserId() != null ? claimsAccessor.getUserId().toString() : null;
        String roleCode = claimsAccessor.getRoleCode();

        Map<String, Object> diagnostics = queryService.getDiagnosticInfo(recordId.toLowerCase(), userId, roleCode);
        return ResponseEntity.ok(ApiResponse.success("Diagnostic information retrieved", diagnostics));
    }
}
