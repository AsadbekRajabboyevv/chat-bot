package com.olima.execution;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ToolExecutionServiceImpl implements ToolExecutionService {
    private final ToolExecutionRepository repository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void record(UUID orgId, UUID conversationId, UUID toolId, String toolName, Map<String, Object> input, ToolResult result, long durationMs) {
        try {
            ToolExecutionEntity entity = ToolExecutionEntity.builder()
                .organizationId(orgId)
                .conversationId(conversationId)
                .toolId(toolId)
                .toolName(toolName)
                .input(objectMapper.writeValueAsString(input))
                .output(result.data() != null ? objectMapper.writeValueAsString(result.data()) : null)
                .status(result.success() ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED)
                .durationMs(durationMs)
                .errorMessage(result.error())
                .build();
            repository.save(entity);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize execution data", e);
        }
    }

    @Override
    public List<ToolExecutionEntity> findByOrganization(UUID orgId) {
        return repository.findByOrganizationIdOrderByCreatedAtDesc(orgId);
    }

    @Override
    public List<ToolExecutionEntity> findByConversation(UUID conversationId) {
        return repository.findByConversationIdOrderByCreatedAtDesc(conversationId);
    }
}
