package com.sttl.workflow.runtime.repository;

import com.sttl.workflow.runtime.entity.WorkflowAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkflowAuditLogRepository extends JpaRepository<WorkflowAuditLog, Long> {

    List<WorkflowAuditLog> findAllByWorkflowInstanceIdOrderByCreatedAtAsc(Long workflowInstanceId);
}


