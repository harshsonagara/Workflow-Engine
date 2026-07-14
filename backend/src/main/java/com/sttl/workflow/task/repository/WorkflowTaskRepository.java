package com.sttl.workflow.task.repository;

import com.sttl.workflow.task.entity.WorkflowTask;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowTaskRepository extends JpaRepository<WorkflowTask, Long> {

    @EntityGraph(attributePaths = {"workflowInstance", "workflowInstance.workflowVersion"})
    Optional<WorkflowTask> findById(Long id);

    @Query("SELECT wt FROM WorkflowTask wt " +
           "JOIN FETCH wt.workflowInstance wi " +
           "JOIN FETCH wi.workflowVersion wv " +
           "WHERE wt.status = 'pending' " +
           "AND (:assignedTo IS NULL OR wt.resolvedAssignedTo = :assignedTo) " +
           "AND (:assignedRole IS NULL OR wt.resolvedAssignedRole = :assignedRole)")
    List<WorkflowTask> findPendingTasks(
            @Param("assignedTo") String assignedTo,
            @Param("assignedRole") String assignedRole);

    /**
     * Multirole aware variant: returns tasks where the user is the direct assignee
     * OR the task is assigned to any of the provided roles.
     * Always pass at least one sentinel value in {@code roles} to avoid an empty-IN clause.
     */
    @Query("SELECT DISTINCT wt FROM WorkflowTask wt " +
           "JOIN FETCH wt.workflowInstance wi " +
           "JOIN FETCH wi.workflowVersion wv " +
           "JOIN FETCH wv.workflowMaster " +
           "WHERE wt.status = 'pending' " +
           "AND ((:userId IS NOT NULL AND wt.resolvedAssignedTo = :userId) " +
           "     OR wt.resolvedAssignedRole IN :roles)")
    List<WorkflowTask> findPendingTasksByUserAndRoles(
            @Param("userId") String userId,
            @Param("roles") Collection<String> roles);

    @Query("SELECT wt FROM WorkflowTask wt " +
           "JOIN FETCH wt.workflowInstance wi " +
           "JOIN FETCH wi.workflowVersion wv " +
           "WHERE wi.entityType = :entityType AND wt.status = 'pending' " +
           "AND (:assignedTo IS NULL OR wt.resolvedAssignedTo = :assignedTo) " +
           "AND (:assignedRole IS NULL OR wt.resolvedAssignedRole = :assignedRole)")
    List<WorkflowTask> findPendingTasksByEntityType(
            @Param("entityType") String entityType,
            @Param("assignedTo") String assignedTo,
            @Param("assignedRole") String assignedRole);

    @Query("SELECT wt FROM WorkflowTask wt " +
           "JOIN FETCH wt.workflowInstance wi " +
           "WHERE wi.id = :instanceId AND wt.status = 'pending' " +
           "AND ((:assignedTo IS NOT NULL AND wt.resolvedAssignedTo = :assignedTo) " +
           "     OR (:assignedRole IS NOT NULL AND wt.resolvedAssignedRole = :assignedRole))")
    Optional<WorkflowTask> findPendingTaskByInstanceId(
            @Param("instanceId") Long instanceId,
            @Param("assignedTo") String assignedTo,
            @Param("assignedRole") String assignedRole);

    int countByWorkflowInstanceIdAndNodeIdAndStatus(Long workflowInstanceId, String nodeId, String status);

    @Modifying
    @Query("UPDATE WorkflowTask wt SET wt.status = 'cancelled' " +
           "WHERE wt.workflowInstanceId = :instanceId " +
           "AND wt.nodeId = :nodeId " +
           "AND wt.id <> :excludeTaskId " +
           "AND wt.status = 'pending'")
    int cancelPendingSiblingTasks(
            @Param("instanceId") Long instanceId,
            @Param("nodeId") String nodeId,
            @Param("excludeTaskId") Long excludeTaskId);

    @EntityGraph(attributePaths = {"workflowInstance"})
    List<WorkflowTask> findAllByWorkflowInstanceId(Long workflowInstanceId);

    // TODO: tenant isolation — add tenantId parameter once SLA queries need to be scoped per tenant
    @Query("SELECT wt FROM WorkflowTask wt " +
           "JOIN FETCH wt.workflowInstance wi " +
           "WHERE wt.status = 'pending' " +
           "AND wt.slaDeadline < :currentTime " +
           "AND wt.slaBreached = false")
    List<WorkflowTask> findPendingTasksWithBreachedSla(@Param("currentTime") OffsetDateTime currentTime);

    List<WorkflowTask> findAllByWorkflowInstanceIdAndNodeIdAndStatus(
            Long workflowInstanceId, String nodeId, String status);
}
