package com.sttl.workflow.version.repository;

import com.sttl.workflow.version.entity.WorkflowVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowVersionRepository extends JpaRepository<WorkflowVersion, Long> {

    Optional<WorkflowVersion> findByIdAndIsDeletedFalse(Long id);

    List<WorkflowVersion> findAllByWorkflowMasterWorkflowNameAndIsDeletedFalse(String workflowName);

    List<WorkflowVersion> findAllByWorkflowMasterIdAndIsDeletedFalse(Long workflowMasterId);

    Optional<WorkflowVersion> findFirstByWorkflowMasterIdAndIsActiveTrueAndIsDeletedFalse(Long workflowMasterId);

    List<WorkflowVersion> findByIsActiveTrueAndIsDeletedFalse();

    @Modifying
    @Query("UPDATE WorkflowVersion wv SET wv.isActive = false WHERE wv.workflowMasterId = :workflowMasterId AND wv.id <> :excludeVersionId")
    void deactivateOtherVersions(@Param("workflowMasterId") Long workflowMasterId, @Param("excludeVersionId") Long excludeVersionId);
}

