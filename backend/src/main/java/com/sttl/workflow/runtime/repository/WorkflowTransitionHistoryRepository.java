package com.sttl.workflow.runtime.repository;

import com.sttl.workflow.runtime.entity.WorkflowTransitionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkflowTransitionHistoryRepository extends JpaRepository<WorkflowTransitionHistory, Long> {
}
