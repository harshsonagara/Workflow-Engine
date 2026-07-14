package com.sttl.workflow.query.service.impl;

import com.sttl.workflow.runtime.repository.WorkflowInstanceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowInstanceQueryServiceImplTest {

    @Mock WorkflowInstanceRepository instanceRepo;

    @InjectMocks WorkflowInstanceQueryServiceImpl service;

    // ── getActiveInstanceCounts ───────────────────────────────────────────────

    @Test
    void getActiveInstanceCounts_withWorkflowId_returnsLinkedHashMapForThatMaster() {
        Object[] row1 = {1L, 3};
        Object[] row2 = {2L, 7};
        when(instanceRepo.countActiveForMaster(10L)).thenReturn(List.<Object[]>of(row1, row2));

        Map<Long, Integer> result = service.getActiveInstanceCounts(10L);

        assertThat(result).isInstanceOf(LinkedHashMap.class);
        assertThat(result).containsExactly(
                Map.entry(1L, 3),
                Map.entry(2L, 7)
        );
    }

    @Test
    void getActiveInstanceCounts_withNullId_queriesAllMasters() {
        Object[] row1 = {5L, 2};
        Object[] row2 = {6L, 4};
        when(instanceRepo.countActiveGroupedByMaster()).thenReturn(List.<Object[]>of(row1, row2));

        Map<Long, Integer> result = service.getActiveInstanceCounts(null);

        assertThat(result).isInstanceOf(LinkedHashMap.class);
        assertThat(result).containsExactly(
                Map.entry(5L, 2),
                Map.entry(6L, 4)
        );
    }

    @Test
    void getActiveInstanceCounts_preservesInsertionOrder() {
        // Rows returned in a specific order — result must preserve it
        Object[] r1 = {3L, 10};
        Object[] r2 = {1L, 5};
        Object[] r3 = {2L, 8};
        when(instanceRepo.countActiveGroupedByMaster()).thenReturn(List.<Object[]>of(r1, r2, r3));

        Map<Long, Integer> result = service.getActiveInstanceCounts(null);

        assertThat(result.keySet()).containsExactly(3L, 1L, 2L);
    }

    @Test
    void getActiveInstanceCounts_emptyResult_returnsEmptyMap() {
        when(instanceRepo.countActiveForMaster(99L)).thenReturn(List.of());

        Map<Long, Integer> result = service.getActiveInstanceCounts(99L);

        assertThat(result).isEmpty();
        assertThat(result).isInstanceOf(LinkedHashMap.class);
    }

    @Test
    void getActiveInstanceCounts_handlesIntegerRowValues() {
        // DB may return Integer or Long for numeric columns — both cast correctly
        Object[] row = {Integer.valueOf(7), Integer.valueOf(12)};
        when(instanceRepo.countActiveForMaster(1L)).thenReturn(List.<Object[]>of(row));

        Map<Long, Integer> result = service.getActiveInstanceCounts(1L);

        assertThat(result).containsExactly(Map.entry(7L, 12));
    }
}
