package com.olima.execution;

import com.olima.tool.ToolEntity;
import com.olima.tool.ToolType;
import java.util.Map;

public interface ToolExecutor {
    ToolResult execute(ToolEntity tool, Map<String, Object> parameters);
    ToolType supportedType();
}
