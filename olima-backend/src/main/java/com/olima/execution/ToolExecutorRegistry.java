package com.olima.execution;

import com.olima.tool.ToolEntity;
import com.olima.tool.ToolType;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ToolExecutorRegistry {
    private final List<ToolExecutor> executors;
    private Map<ToolType, ToolExecutor> executorMap;

    @PostConstruct
    public void init() {
        executorMap = executors.stream()
            .collect(Collectors.toMap(ToolExecutor::supportedType, e -> e));
    }

    public ToolExecutor getExecutor(ToolType type) {
        ToolExecutor executor = executorMap.get(type);
        if (executor == null) {
            throw new IllegalArgumentException("No executor found for tool type: " + type);
        }
        return executor;
    }

    public ToolResult execute(ToolEntity tool, Map<String, Object> params) {
        return getExecutor(tool.getType()).execute(tool, params);
    }
}
