package com.sttl.workflow.definition.repository;

import com.sttl.workflow.definition.entity.WorkflowMaster;
import com.sttl.workflow.definition.dto.workflow.WorkflowDropdownDto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowMasterRepository extends JpaRepository<WorkflowMaster, Long> {

    List<WorkflowMaster> findAllByIsDeletedFalseOrderByCreatedAtDesc();

    Optional<WorkflowMaster> findByIdAndIsDeletedFalse(Long id);

    Optional<WorkflowMaster> findByWorkflowNameAndIsDeletedFalse(String workflowName);

    /** Lookup by machine-readable code — used by the startWorkflow(code, context) API */
    Optional<WorkflowMaster> findByCodeAndIsDeletedFalse(String code);

    /** Lookup by code scoped to a specific tenant */
    Optional<WorkflowMaster> findByCodeAndTenantIdAndIsDeletedFalse(String code, String tenantId);

    @Query("SELECT DISTINCT wm FROM WorkflowMaster wm " +
           "JOIN FETCH wm.workflowVersions wv " +
           "WHERE wm.isDeleted = false AND wv.isActive = true AND wv.isDeleted = false " +
           "ORDER BY wm.workflowName ASC")
    List<WorkflowMaster> findAllWorkflowMastersWithActiveVersion();

    @Query("SELECT new com.sttl.workflow.definition.dto.workflow.WorkflowDropdownDto(wm.id, wm.workflowName, wm.code) " +
           "FROM WorkflowMaster wm " +
           "WHERE wm.isDeleted = false " +
           "ORDER BY wm.createdAt DESC")
    List<WorkflowDropdownDto> findAllNamesOrderByCreatedAtDesc();
}
