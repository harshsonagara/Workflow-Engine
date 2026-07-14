package com.sttl.workflow.mapping.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Used for both the response from GET /mappings/roles
 * and the request body of POST /mappings/roles/sync.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleRegistryDto {

    /** The external system registering these roles. If not provided, defaults to "DEFAULT". */
    private String source;

    @Builder.Default
    private List<RoleEntry> roles = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleEntry {
        /** Machine-readable value stored in workflow definitions. */
        private String id;

        /** Human-readable label shown in the designer. */
        private String label;

        /**
         * "role" or "user".
         * Defaults to "role" if not provided.
         */
        @Builder.Default
        private String type = "role";
    }
}
