package com.sttl.workflow.definition.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowValidationResult {

    @JsonProperty("valid")
    private boolean isValid;

    @Builder.Default
    private List<String> errors = new ArrayList<>();

    @Builder.Default
    private List<String> warnings = new ArrayList<>();

    /**
     * Human-readable summary shown at the top of the response.
     * Populated automatically via {@link #buildSummary()}.
     */
    private String summary;

    /** Total number of blocking errors. */
    public int getErrorCount() {
        return errors == null ? 0 : errors.size();
    }

    /** Total number of non-blocking warnings. */
    public int getWarningCount() {
        return warnings == null ? 0 : warnings.size();
    }

    /**
     * Call this once all errors/warnings have been collected to set a
     * human-readable summary string on the result.
     */
    public void buildSummary() {
        if (isValid) {
            summary = getWarningCount() > 0
                    ? "Workflow definition is valid with " + getWarningCount() + " warning(s). Review warnings before saving."
                    : "Workflow definition is valid. No errors or warnings found.";
        } else {
            summary = "Workflow definition is invalid. Found " + getErrorCount() + " error(s)" +
                      (getWarningCount() > 0 ? " and " + getWarningCount() + " warning(s)" : "") +
                      ". Fix all errors before activating this workflow.";
        }
    }
}
