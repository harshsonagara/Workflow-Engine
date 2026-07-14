package com.sttl.workflow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sttl.workflow.definition.dto.workflow.WorkflowDefinitionStructure;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * Thin @Service wrapper around JSON → {@link WorkflowDefinitionStructure} parsing.
 * Results are cached by version ID so that hot paths (task listing, action execution)
 * never reparse the same JSON blob twice within the cache TTL window.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WorkflowDefinitionParser {

    private final ObjectMapper objectMapper;

    // ── Version-based cache ───────────────────────────────────────────────────

    @Cacheable(value = "wfVersionStructure", key = "#versionId")
    public WorkflowDefinitionStructure parseVersionJson(Long versionId, String definitionJson) {
        log.debug("Parsing definition JSON for version {}", versionId);
        return parse(definitionJson);
    }

    @CacheEvict(value = "wfVersionStructure", key = "#versionId")
    public void evictVersionCache(Long versionId) {
        log.debug("Evicted definition cache for version {}", versionId);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private WorkflowDefinitionStructure parse(String json) {
        try {
            return objectMapper.readValue(json, WorkflowDefinitionStructure.class);
        } catch (Exception e) {
            log.warn("Failed to parse workflow definition JSON: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "The workflow definition JSON is invalid or malformed.");
        }
    }
}

