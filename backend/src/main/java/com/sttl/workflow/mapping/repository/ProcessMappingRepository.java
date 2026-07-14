package com.sttl.workflow.mapping.repository;

import com.sttl.workflow.mapping.entity.ProcessMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProcessMappingRepository extends JpaRepository<ProcessMapping, Long> {
    List<ProcessMapping> findAllByIsActiveTrueOrderByProcessNameAsc();
    Optional<ProcessMapping> findByProcessCodeAndIsActiveTrue(String processCode);
    List<ProcessMapping> findAllByWorkflowMasterIdAndIsActiveTrue(Long workflowMasterId);
}
