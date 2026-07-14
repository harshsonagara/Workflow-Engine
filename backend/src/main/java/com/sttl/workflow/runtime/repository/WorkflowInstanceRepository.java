package com.sttl.workflow.runtime.repository;

import com.sttl.workflow.runtime.entity.WorkflowInstance;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstance, Long> {

    @EntityGraph(attributePaths = {"workflowTasks", "workflowVersion"})
    Optional<WorkflowInstance> findById(Long id);

    @Query("SELECT wi FROM WorkflowInstance wi " +
           "WHERE LOWER(wi.businessKey) = LOWER(:businessKey) " +
           "AND wi.status IN ('running', 'pending') " +
           "AND wi.completedAt IS NULL " +
           "ORDER BY wi.createdAt DESC " +
           "LIMIT 1")
    @EntityGraph(attributePaths = {"workflowTasks", "workflowVersion"})
    Optional<WorkflowInstance> findActiveInstanceByBusinessKey(@Param("businessKey") String businessKey);

    @EntityGraph(attributePaths = {"workflowTasks", "workflowVersion"})
    @Query("SELECT wi FROM WorkflowInstance wi " +
           "WHERE LOWER(wi.businessKey) = LOWER(:businessKey) " +
           "ORDER BY wi.createdAt DESC " +
           "LIMIT 1")
    Optional<WorkflowInstance> findLatestByBusinessKey(@Param("businessKey") String businessKey);

    @EntityGraph(attributePaths = {"workflowVersion"})
    List<WorkflowInstance> findByCreatedByOrderByCreatedAtDesc(String createdBy);

    @Query(value =
        "SELECT " +
        "  COUNT(CASE WHEN status ILIKE '%completed%' THEN 1 END)                         AS completed, " +
        "  COUNT(CASE WHEN status ILIKE 'running' AND completed_at IS NULL THEN 1 END)    AS inProcess, " +
        "  COUNT(CASE WHEN completed_at IS NULL THEN 1 END)                               AS submitted " +
        "FROM workflow.instance",
        nativeQuery = true)
    Object[] getDashboardStats();

    long countByWorkflowVersionIdAndCompletedAtIsNull(Long workflowVersionId);

    @Query("SELECT COUNT(wi) FROM WorkflowInstance wi " +
           "WHERE wi.workflowVersion.workflowMaster.id = :masterId AND wi.completedAt IS NULL")
    long countActiveByWorkflowMasterId(@Param("masterId") Long masterId);

    @Query("SELECT wi FROM WorkflowInstance wi " +
           "WHERE wi.workflowVersion.workflowMaster.id = :masterId AND wi.completedAt IS NULL")
    List<WorkflowInstance> findActiveByWorkflowMasterId(@Param("masterId") Long masterId);

    List<WorkflowInstance> findAllByCompletedAtIsNull();

    @Query("SELECT wi.workflowVersion.workflowMaster.id, COUNT(wi) FROM WorkflowInstance wi " +
           "WHERE wi.completedAt IS NULL " +
           "GROUP BY wi.workflowVersion.workflowMaster.id")
    List<Object[]> countActiveGroupedByMaster();

    @Query("SELECT wi.workflowVersion.workflowMaster.id, COUNT(wi) FROM WorkflowInstance wi " +
           "WHERE wi.workflowVersion.workflowMaster.id = :masterId AND wi.completedAt IS NULL " +
           "GROUP BY wi.workflowVersion.workflowMaster.id")
    List<Object[]> countActiveForMaster(@Param("masterId") Long masterId);
}
