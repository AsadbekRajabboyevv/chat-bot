package com.olima.execution;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface ToolExecutionService {
    void record(UUID orgId, UUID conversationId, UUID toolId, String toolName, Map<String, Object> input, ToolResult result, long durationMs);
    List<ToolExecutionEntity> findByOrganization(UUID orgId);
    List<ToolExecutionEntity> findByConversation(UUID conversationId);
}
