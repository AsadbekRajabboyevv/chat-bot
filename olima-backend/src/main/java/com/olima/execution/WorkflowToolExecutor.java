package com.olima.execution;

import com.olima.tool.ToolEntity;
import com.olima.tool.ToolType;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
public class WorkflowToolExecutor implements ToolExecutor {
    @Override
    public ToolType supportedType() {
        return ToolType.WORKFLOW;
    }

    @Override
    public ToolResult execute(ToolEntity tool, Map<String, Object> parameters) {
        return ToolResult.failure("Workflow tool type not yet implemented");
    }
}
