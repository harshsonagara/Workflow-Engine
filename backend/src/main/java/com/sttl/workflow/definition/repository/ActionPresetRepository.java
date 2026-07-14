package com.sttl.workflow.definition.repository;

import com.sttl.workflow.definition.entity.ActionPreset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActionPresetRepository extends JpaRepository<ActionPreset, Long> {
    List<ActionPreset> findByIsActiveTrueOrderBySortOrderAsc();
}
