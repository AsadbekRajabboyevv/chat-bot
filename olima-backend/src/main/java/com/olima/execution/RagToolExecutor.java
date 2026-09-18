package com.olima.execution;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.olima.knowledge.DocumentChunkEntity;
import com.olima.knowledge.KnowledgeService;
import com.olima.tool.ToolEntity;
import com.olima.tool.ToolType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class RagToolExecutor implements ToolExecutor {
    private static final int MAX_RESULTS = 10;

    private final KnowledgeService knowledgeService;
    private final ObjectMapper objectMapper;

    @Override
    public ToolType supportedType() {
        return ToolType.RAG;
    }

    @Override
    public ToolResult execute(ToolEntity tool, Map<String, Object> parameters) {
        try {
            String query = (String) parameters.get("query");
            if (query == null || query.isBlank()) {
                return ToolResult.failure("Query parameter is required");
            }
            List<DocumentChunkEntity> chunks = knowledgeService.search(tool.getOrganizationId(), query, MAX_RESULTS);
            List<String> sources = chunks.stream()
                .map(DocumentChunkEntity::getSourceUrl)
                .filter(url -> url != null && !url.isBlank())
                .distinct()
                .collect(Collectors.toList());
            return ToolResult.success(chunks, sources);
        } catch (Exception e) {
            return ToolResult.failure(e.getMessage());
        }
    }
}
