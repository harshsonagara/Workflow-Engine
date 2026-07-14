package com.sttl.workflow.query.dto;

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
public class AvailableActionsDto {
    private boolean success;
    @Builder.Default
    private List<String> actions = new ArrayList<>();
    private String message;
}
