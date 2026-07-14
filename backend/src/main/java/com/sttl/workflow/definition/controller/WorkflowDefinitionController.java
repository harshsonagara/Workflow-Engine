package com.sttl.workflow.definition.controller;

import com.sttl.workflow.common.dto.ApiResponse;

import com.sttl.workflow.definition.dto.WorkflowValidationResult;
import com.sttl.workflow.definition.dto.master.CreateWorkflowMasterRequest;
import com.sttl.workflow.definition.dto.version.CreateVersionRequest;
import com.sttl.workflow.definition.dto.version.WorkflowVersionDto;
import com.sttl.workflow.definition.dto.workflow.WorkflowDefinitionDto;
import com.sttl.workflow.definition.dto.workflow.WorkflowMasterWithActiveVersionDto;
import com.sttl.workflow.definition.dto.workflow.WorkflowMasterWithVersionsDto;
import com.sttl.workflow.definition.service.impl.WorkflowDefinitionServiceImpl;

import com.sttl.workflow.query.dto.AvailableActionsDto;
import com.sttl.workflow.query.dto.ConditionalKeysResponseDto;
import com.sttl.workflow.query.dto.PendingInstancesResult;
import com.sttl.workflow.query.service.impl.WorkflowInstanceQueryServiceImpl;
import com.sttl.workflow.query.service.impl.WorkflowQueryServiceImpl;

import com.sttl.workflow.security.ClaimsAccessor;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/workflow-engine-api/workflow-definitions")
@Tag(name = "Workflow Definition", description = "Workflow definition CRUD, validation, and version control endpoints")
public class WorkflowDefinitionController {

    private final WorkflowDefinitionServiceImpl workflowDefinitionService;
    private final WorkflowQueryServiceImpl workflowQueryService;
    private final WorkflowInstanceQueryServiceImpl instanceQueryService;
    private final ClaimsAccessor claimsAccessor;

    public WorkflowDefinitionController(
            WorkflowDefinitionServiceImpl workflowDefinitionService,
            WorkflowQueryServiceImpl workflowQueryService,
            WorkflowInstanceQueryServiceImpl instanceQueryService,
            ClaimsAccessor claimsAccessor
    ) {
        this.workflowDefinitionService = workflowDefinitionService;
        this.workflowQueryService = workflowQueryService;
        this.instanceQueryService = instanceQueryService;
        this.claimsAccessor = claimsAccessor;
    }

    // ── Definition CRUD ──────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @Operation(summary = "Get workflow definition (version) by ID")
    public ResponseEntity<ApiResponse<WorkflowDefinitionDto>> getWorkflowDefinition(@PathVariable long id) {
        return ResponseEntity.ok(ApiResponse.success("Workflow definition retrieved successfully",
                workflowDefinitionService.getWorkflowDefinition(id)));
    }

    @GetMapping("/get-all-workflow-masters")
    @Operation(summary = "Get all workflow masters with their active versions")
    public ResponseEntity<ApiResponse<List<WorkflowMasterWithActiveVersionDto>>> getAllWorkflowMasters() {
        return ResponseEntity.ok(ApiResponse.success("Workflow masters retrieved successfully",
                workflowDefinitionService.getAllWorkflowMastersWithActiveVersion()));
    }

    @PostMapping("/validate")
    @Operation(summary = "Validate workflow definition JSON")
    public ResponseEntity<ApiResponse<WorkflowValidationResult>> validateWorkflowDefinition(
            @RequestBody Map<String, Object> request) {
        String definitionJson = request.get("definitionJson") != null ? request.get("definitionJson").toString() : "";
        if (definitionJson.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.failure("Request body must contain a 'definitionJson' field"));
        }
        WorkflowValidationResult result = workflowDefinitionService.validateWorkflowDefinition(definitionJson);
        if (result.isValid()) return ResponseEntity.ok(ApiResponse.success(result.getSummary(), result));
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_CONTENT)
                .body(new ApiResponse<>(false, result.getSummary(), result));
    }

    // ── Version lifecycle ────────────────────────────────────────────────────────

    @PostMapping("/create-version")
    @Operation(summary = "Create new version of existing workflow")
    public ResponseEntity<ApiResponse<WorkflowVersionDto>> createNewVersion(
            @Valid @RequestBody CreateVersionRequest request) {
        Integer userId = requireUserId();
        WorkflowVersionDto saved = workflowDefinitionService.createNewVersion(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("New version created", saved));
    }

    @PostMapping("/{versionId}/activate")
    @Operation(summary = "Activate a workflow version by ID")
    public ResponseEntity<ApiResponse<Map<String, Object>>> activateWorkflowVersion(
            @PathVariable long versionId) {
        Integer userId = requireUserId();
        workflowDefinitionService.activateWorkflowVersion(versionId, userId);
        return ResponseEntity.ok(ApiResponse.success("Version activated", Map.of("versionId", versionId)));
    }

    @GetMapping("/{versionId}/available-actions")
    @Operation(summary = "Get available actions from end node's incoming edges")
    public ResponseEntity<ApiResponse<AvailableActionsDto>> getAvailableActions(@PathVariable long versionId) {
        AvailableActionsDto result = workflowQueryService.getAvailableActions(versionId);
        if (!result.isSuccess()) return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.failure(result.getMessage()));
        return ResponseEntity.ok(ApiResponse.success(result.getMessage(), result));
    }

    @GetMapping("/conditional-keys")
    @Operation(summary = "Get conditional node keys for a workflow by name and version")
    public ResponseEntity<ApiResponse<ConditionalKeysResponseDto>> getConditionalKeys(
            @RequestParam String workflowName,
            @RequestParam int version) {
        if (workflowName == null || workflowName.trim().isEmpty()) return badRequest("Workflow name is required");
        if (version <= 0) return badRequest("Version must be greater than 0");
        return ResponseEntity.ok(ApiResponse.success("Conditional keys retrieved successfully",
                workflowQueryService.getConditionalKeysByName(workflowName, version)));
    }

    // ── Master management ────────────────────────────────────────────────────────

    @PostMapping("/create-workflow-master")
    @Operation(summary = "Create a new workflow master with its initial version")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createWorkflowMaster(
            @Valid @RequestBody CreateWorkflowMasterRequest request) {
        Integer userId = requireUserId();
        WorkflowVersionDto saved = workflowDefinitionService.createWorkflowMaster(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Workflow master created successfully", Map.of(
                "workflowMasterId", saved.getWorkflowMasterId(),
                "workflowVersionId", saved.getId())));
    }

    @GetMapping("/masters/{masterId}")
    @Operation(summary = "Get a workflow master with all its versions")
    public ResponseEntity<ApiResponse<WorkflowMasterWithVersionsDto>> getWorkflowMasterWithVersions(
            @PathVariable long masterId) {
        List<WorkflowMasterWithVersionsDto> result = workflowDefinitionService.getWorkflowMasterAndVersions(masterId);
        return ResponseEntity.ok(ApiResponse.success("Workflow master retrieved successfully", result.getFirst()));
    }

    @DeleteMapping("/masters/{masterId}")
    @Operation(summary = "Soft-delete a workflow master. Fails if active instances exist.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteWorkflowMaster(@PathVariable long masterId) {
        Integer userId = requireUserId();
        workflowDefinitionService.deleteWorkflowMaster(masterId, userId);
        return ResponseEntity.ok(ApiResponse.success("Workflow master deleted successfully", Map.of("masterId", masterId)));
    }

    @DeleteMapping("/versions/{versionId}")
    @Operation(summary = "Soft-delete a workflow version. Fails if active or has running instances.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> deleteWorkflowVersion(@PathVariable long versionId) {
        Integer userId = requireUserId();
        workflowDefinitionService.deleteWorkflowVersion(versionId, userId);
        return ResponseEntity.ok(ApiResponse.success("Workflow version deleted successfully", Map.of("versionId", versionId)));
    }

    @PostMapping("/masters/{masterId}/toggle-status")
    @Operation(summary = "Toggle workflow master active/inactive status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleWorkflowMasterStatus(@PathVariable long masterId) {
        Integer userId = requireUserId();
        boolean active = workflowDefinitionService.toggleWorkflowMasterStatus(masterId, userId);
        return ResponseEntity.ok(ApiResponse.success(
                "Workflow master " + (active ? "activated" : "deactivated") + " successfully",
                Map.of("masterId", masterId)));
    }

    // ── Instance queries ─────────────────────────────────────────────────────────

    @GetMapping("/active-instance-counts")
    @Operation(summary = "Get active instance count for a specific workflow or all workflows")
    public ResponseEntity<ApiResponse<Map<Long, Integer>>> getActiveInstanceCounts(
            @RequestParam(required = false) Long workflowId) {
        Map<Long, Integer> counts = instanceQueryService.getActiveInstanceCounts(workflowId);
        return ResponseEntity.ok(ApiResponse.success(
                workflowId != null ? "Active instance count retrieved for workflow " + workflowId
                        : "Active instance counts retrieved for all workflows",
                counts));
    }

    @GetMapping("/{workflowId}/pending-instances")
    @Operation(summary = "Check if workflow has pending instances")
    public ResponseEntity<ApiResponse<PendingInstancesResult>> hasPendingInstances(@PathVariable long workflowId) {
        PendingInstancesResult result = instanceQueryService.hasPendingInstances(workflowId);
        return ResponseEntity.ok(ApiResponse.success(
                result.isHasPending() ? "Workflow has " + result.getCount() + " pending instances"
                        : "No pending instances",
                result));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private static <T> ResponseEntity<ApiResponse<T>> badRequest(String message) {
        return ResponseEntity.badRequest().body(ApiResponse.failure(message));
    }

    private Integer requireUserId() {
        Integer userId = claimsAccessor.getUserId();
        return userId != null ? userId : -1;
    }
}
