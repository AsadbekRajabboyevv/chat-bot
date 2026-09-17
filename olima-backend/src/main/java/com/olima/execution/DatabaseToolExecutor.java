package com.olima.execution;

import com.olima.tool.ToolEntity;
import com.olima.tool.ToolType;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
public class DatabaseToolExecutor implements ToolExecutor {
    @Override
    public ToolType supportedType() {
        return ToolType.DATABASE;
    }

    @Override
    public ToolResult execute(ToolEntity tool, Map<String, Object> parameters) {
        return ToolResult.failure("Database tool type not yet implemented");
    }
}
