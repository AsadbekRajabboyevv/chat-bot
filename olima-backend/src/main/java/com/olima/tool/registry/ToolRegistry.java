package com.olima.tool.registry;

import com.olima.tool.ToolEntity;

import java.util.List;
import java.util.UUID;

public interface ToolRegistry {
    List<ToolEntity> getEnabledTools(UUID organizationId);
    ToolEntity findToolByName(UUID organizationId, String toolName);
    void validateTool(ToolEntity tool);
}
