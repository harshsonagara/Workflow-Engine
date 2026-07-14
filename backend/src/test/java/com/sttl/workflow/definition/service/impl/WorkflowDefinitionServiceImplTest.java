package com.sttl.workflow.definition.service.impl;

import com.sttl.workflow.definition.dto.WorkflowValidationResult;
import com.sttl.workflow.definition.dto.master.CreateWorkflowMasterRequest;
import com.sttl.workflow.definition.dto.version.CreateVersionRequest;
import com.sttl.workflow.definition.dto.version.WorkflowVersionDto;
import com.sttl.workflow.definition.entity.WorkflowMaster;
import com.sttl.workflow.definition.repository.WorkflowMasterRepository;
import com.sttl.workflow.runtime.repository.WorkflowInstanceRepository;
import com.sttl.workflow.service.impl.WorkflowValidationServiceImpl;
import com.sttl.workflow.version.entity.WorkflowVersion;
import com.sttl.workflow.version.repository.WorkflowVersionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowDefinitionServiceImplTest {

    @Mock WorkflowMasterRepository masterRepo;
    @Mock WorkflowVersionRepository versionRepo;
    @Mock WorkflowInstanceRepository instanceRepo;
    @Mock WorkflowValidationServiceImpl validationService;

    @InjectMocks WorkflowDefinitionServiceImpl service;

    // Plain builder instances — no mock stubbing, so no UnnecessaryStubbingException
    private static final WorkflowValidationResult VALID =
            WorkflowValidationResult.builder().isValid(true).build();
    private static final WorkflowValidationResult INVALID =
            WorkflowValidationResult.builder().isValid(false).errors(List.of("Start node missing")).build();

    WorkflowMaster master;
    WorkflowVersion version;

    @BeforeEach
    void setUp() {
        master = WorkflowMaster.builder()
                .id(1L).workflowName("Leave Approval").code("LEAVE_APPROVAL")
                .isActive(true).isDeleted(false).build();

        version = WorkflowVersion.builder()
                .id(10L).workflowMaster(master).versionName("v1")
                .definitionJson("{}").isActive(false).isDeleted(false).build();
    }

    // ── getWorkflowDefinition ─────────────────────────────────────────────────

    @Test
    void getWorkflowDefinition_found_returnsMappedDto() {
        when(versionRepo.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(version));

        var result = service.getWorkflowDefinition(10L);

        assertThat(result.getVersionName()).isEqualTo("v1");
        assertThat(result.getWorkflowName()).isEqualTo("Leave Approval");
    }

    @Test
    void getWorkflowDefinition_notFound_throwsNotFound() {
        when(versionRepo.findByIdAndIsDeletedFalse(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getWorkflowDefinition(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── createWorkflowMaster ──────────────────────────────────────────────────

    @Test
    void createWorkflowMaster_validInput_returnsVersionDto() {
        when(validationService.validateWorkflowDefinition(any())).thenReturn(VALID);
        when(masterRepo.findByWorkflowNameAndIsDeletedFalse("Leave Approval")).thenReturn(Optional.empty());
        when(masterRepo.findByCodeAndTenantIdAndIsDeletedFalse(anyString(), any())).thenReturn(Optional.empty());
        when(masterRepo.save(any())).thenReturn(master);
        when(versionRepo.save(any())).thenReturn(version);

        CreateWorkflowMasterRequest req = CreateWorkflowMasterRequest.builder()
                .workflowName("Leave Approval").versionName("v1").definitionJson("{}").build();

        WorkflowVersionDto result = service.createWorkflowMaster(req, 1);

        assertThat(result.getVersionName()).isEqualTo("v1");
        assertThat(result.getWorkflowMasterId()).isEqualTo(1L);
        verify(masterRepo).save(any());
        verify(versionRepo).save(any());
    }

    @Test
    void createWorkflowMaster_invalidDefinition_throwsUnprocessableContent() {
        when(validationService.validateWorkflowDefinition(any())).thenReturn(INVALID);

        CreateWorkflowMasterRequest req = CreateWorkflowMasterRequest.builder()
                .workflowName("Leave Approval").versionName("v1").definitionJson("bad").build();

        assertThatThrownBy(() -> service.createWorkflowMaster(req, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT));

        verify(masterRepo, never()).save(any());
    }

    @Test
    void createWorkflowMaster_duplicateName_throwsConflict() {
        when(validationService.validateWorkflowDefinition(any())).thenReturn(VALID);
        when(masterRepo.findByWorkflowNameAndIsDeletedFalse("Leave Approval")).thenReturn(Optional.of(master));

        CreateWorkflowMasterRequest req = CreateWorkflowMasterRequest.builder()
                .workflowName("Leave Approval").versionName("v1").definitionJson("{}").build();

        assertThatThrownBy(() -> service.createWorkflowMaster(req, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void createWorkflowMaster_duplicateCodeInTenant_throwsConflict() {
        when(validationService.validateWorkflowDefinition(any())).thenReturn(VALID);
        when(masterRepo.findByWorkflowNameAndIsDeletedFalse(any())).thenReturn(Optional.empty());
        when(masterRepo.findByCodeAndTenantIdAndIsDeletedFalse(anyString(), any())).thenReturn(Optional.of(master));

        CreateWorkflowMasterRequest req = CreateWorkflowMasterRequest.builder()
                .workflowName("Leave Approval").versionName("v1").definitionJson("{}").tenantId("T1").build();

        assertThatThrownBy(() -> service.createWorkflowMaster(req, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    // ── createNewVersion ──────────────────────────────────────────────────────

    @Test
    void createNewVersion_validInput_returnsVersionDto() {
        when(masterRepo.findByWorkflowNameAndIsDeletedFalse("Leave Approval")).thenReturn(Optional.of(master));
        when(versionRepo.findAllByWorkflowMasterIdAndIsDeletedFalse(1L)).thenReturn(List.of());
        when(versionRepo.save(any())).thenReturn(version);

        CreateVersionRequest req = CreateVersionRequest.builder()
                .workflowName("Leave Approval").versionName("v2").definitionJson("{}").build();

        WorkflowVersionDto result = service.createNewVersion(req, 1);

        assertThat(result.getVersionName()).isEqualTo("v1"); // returned mock version
        verify(versionRepo).save(any());
    }

    @Test
    void createNewVersion_blankVersionName_throwsUnprocessableContent() {
        CreateVersionRequest req = CreateVersionRequest.builder()
                .workflowName("Leave Approval").versionName("   ").definitionJson("{}").build();

        assertThatThrownBy(() -> service.createNewVersion(req, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT));

        verify(masterRepo, never()).findByWorkflowNameAndIsDeletedFalse(any());
    }

    @Test
    void createNewVersion_workflowNotFound_throwsNotFound() {
        when(masterRepo.findByWorkflowNameAndIsDeletedFalse("Missing")).thenReturn(Optional.empty());

        CreateVersionRequest req = CreateVersionRequest.builder()
                .workflowName("Missing").versionName("v2").definitionJson("{}").build();

        assertThatThrownBy(() -> service.createNewVersion(req, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void createNewVersion_duplicateVersionName_throwsConflict() {
        WorkflowVersion existing = WorkflowVersion.builder()
                .id(5L).workflowMaster(master).versionName("v2").build();
        when(masterRepo.findByWorkflowNameAndIsDeletedFalse("Leave Approval")).thenReturn(Optional.of(master));
        when(versionRepo.findAllByWorkflowMasterIdAndIsDeletedFalse(1L)).thenReturn(List.of(existing));

        CreateVersionRequest req = CreateVersionRequest.builder()
                .workflowName("Leave Approval").versionName("v2").definitionJson("{}").build();

        assertThatThrownBy(() -> service.createNewVersion(req, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    // ── activateWorkflowVersion ───────────────────────────────────────────────

    @Test
    void activateWorkflowVersion_found_activatesVersion() {
        when(versionRepo.findByIdAndIsDeletedFalse(10L)).thenReturn(Optional.of(version));

        service.activateWorkflowVersion(10L, 1);

        assertThat(version.isActive()).isTrue();
        verify(versionRepo).deactivateOtherVersions(1L, 10L);
        verify(versionRepo).save(version);
    }

    @Test
    void activateWorkflowVersion_notFound_throwsNotFound() {
        when(versionRepo.findByIdAndIsDeletedFalse(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.activateWorkflowVersion(99L, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ── deleteWorkflowMaster ──────────────────────────────────────────────────

    @Test
    void deleteWorkflowMaster_noActiveInstances_softDeletes() {
        when(masterRepo.findById(1L)).thenReturn(Optional.of(master));
        when(instanceRepo.countActiveByWorkflowMasterId(1L)).thenReturn(0L);

        service.deleteWorkflowMaster(1L, 1);

        assertThat(master.isDeleted()).isTrue();
        verify(masterRepo).save(master);
    }

    @Test
    void deleteWorkflowMaster_notFound_throwsNotFound() {
        when(masterRepo.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteWorkflowMaster(99L, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void deleteWorkflowMaster_alreadyDeleted_throwsConflict() {
        master.setDeleted(true);
        when(masterRepo.findById(1L)).thenReturn(Optional.of(master));

        assertThatThrownBy(() -> service.deleteWorkflowMaster(1L, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));

        verify(instanceRepo, never()).countActiveByWorkflowMasterId(anyLong());
    }

    @Test
    void deleteWorkflowMaster_pendingInstances_throwsConflict() {
        when(masterRepo.findById(1L)).thenReturn(Optional.of(master));
        when(instanceRepo.countActiveByWorkflowMasterId(1L)).thenReturn(3L);

        assertThatThrownBy(() -> service.deleteWorkflowMaster(1L, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));

        verify(masterRepo, never()).save(any());
    }

    // ── deleteWorkflowVersion ─────────────────────────────────────────────────

    @Test
    void deleteWorkflowVersion_draftWithNoInstances_softDeletes() {
        when(versionRepo.findById(10L)).thenReturn(Optional.of(version));
        when(instanceRepo.countByWorkflowVersionIdAndCompletedAtIsNull(10L)).thenReturn(0L);

        service.deleteWorkflowVersion(10L, 1);

        assertThat(version.isDeleted()).isTrue();
        verify(versionRepo).save(version);
    }

    @Test
    void deleteWorkflowVersion_notFound_throwsNotFound() {
        when(versionRepo.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteWorkflowVersion(99L, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void deleteWorkflowVersion_alreadyDeleted_throwsConflict() {
        version.setDeleted(true);
        when(versionRepo.findById(10L)).thenReturn(Optional.of(version));

        assertThatThrownBy(() -> service.deleteWorkflowVersion(10L, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void deleteWorkflowVersion_activeVersion_throwsConflict() {
        version.setActive(true);
        when(versionRepo.findById(10L)).thenReturn(Optional.of(version));

        assertThatThrownBy(() -> service.deleteWorkflowVersion(10L, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void deleteWorkflowVersion_pendingInstances_throwsConflict() {
        when(versionRepo.findById(10L)).thenReturn(Optional.of(version));
        when(instanceRepo.countByWorkflowVersionIdAndCompletedAtIsNull(10L)).thenReturn(2L);

        assertThatThrownBy(() -> service.deleteWorkflowVersion(10L, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));

        verify(versionRepo, never()).save(any());
    }

    // ── toggleWorkflowMasterStatus ────────────────────────────────────────────

    @Test
    void toggleWorkflowMasterStatus_activeMaster_deactivatesAndReturnsFalse() {
        master.setActive(true);
        when(masterRepo.findById(1L)).thenReturn(Optional.of(master));

        boolean result = service.toggleWorkflowMasterStatus(1L, 1);

        assertThat(result).isFalse();
        assertThat(master.isActive()).isFalse();
        verify(masterRepo).save(master);
    }

    @Test
    void toggleWorkflowMasterStatus_inactiveMaster_activatesAndReturnsTrue() {
        master.setActive(false);
        when(masterRepo.findById(1L)).thenReturn(Optional.of(master));

        boolean result = service.toggleWorkflowMasterStatus(1L, 1);

        assertThat(result).isTrue();
        assertThat(master.isActive()).isTrue();
    }

    @Test
    void toggleWorkflowMasterStatus_notFound_throwsNotFound() {
        when(masterRepo.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.toggleWorkflowMasterStatus(99L, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void toggleWorkflowMasterStatus_deletedMaster_throwsConflict() {
        master.setDeleted(true);
        when(masterRepo.findById(1L)).thenReturn(Optional.of(master));

        assertThatThrownBy(() -> service.toggleWorkflowMasterStatus(1L, 1))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }
}
