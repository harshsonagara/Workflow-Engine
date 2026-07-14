package com.sttl.workflow.task.dto;

import com.sttl.workflow.definition.dto.node.ActionDefinitionDto;
import com.sttl.workflow.monitoring.dto.SlaStatusDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActionResolverDto {
    private Long taskId;
    private Long instanceId;
    private String recordId;
    private String workflowName;
    private String currentNodeId;
    private String currentNodeLabel;
    @Builder.Default
    private List<ActionDefinitionDto> availableActions = new ArrayList<>();
    private String status;
    private SlaStatusDto slaStatus;
    private Boolean allowEdit;
}
