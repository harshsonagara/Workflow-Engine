package com.sttl.workflow.query.service.impl;

import com.sttl.workflow.query.dto.PendingInstancesResult;
import com.sttl.workflow.runtime.repository.WorkflowInstanceRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
@Transactional(readOnly = true)
public class WorkflowInstanceQueryServiceImpl {

    private final WorkflowInstanceRepository instanceRepo;

    public WorkflowInstanceQueryServiceImpl(WorkflowInstanceRepository instanceRepo) {
        this.instanceRepo = instanceRepo;
    }

    public PendingInstancesResult hasPendingInstances(Long workflowId) {
        long pendingCount = instanceRepo.countActiveByWorkflowMasterId(workflowId);
        return PendingInstancesResult.builder()
                .hasPending(pendingCount > 0)
                .count((int) pendingCount)
                .build();
    }

    public Map<Long, Integer> getActiveInstanceCounts(Long workflowId) {
        List<Object[]> rows = workflowId != null
                ? instanceRepo.countActiveForMaster(workflowId)
                : instanceRepo.countActiveGroupedByMaster();
        return rows.stream().collect(Collectors.toMap(
                r -> ((Number) r[0]).longValue(),
                r -> ((Number) r[1]).intValue(),
                (a, b) -> a,
                LinkedHashMap::new
        ));
    }
}
