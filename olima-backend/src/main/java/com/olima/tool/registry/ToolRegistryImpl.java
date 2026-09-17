package com.olima.tool.registry;

import com.olima.tool.ToolEntity;
import com.olima.tool.ToolRepository;
import com.olima.tool.exception.ToolNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ToolRegistryImpl implements ToolRegistry {
    private final ToolRepository toolRepository;

    @Override
    public List<ToolEntity> getEnabledTools(UUID organizationId) {
        return toolRepository.findByOrganizationIdAndEnabledTrue(organizationId);
    }

    @Override
    public ToolEntity findToolByName(UUID organizationId, String toolName) {
        ToolEntity tool = toolRepository.findByOrganizationIdAndName(organizationId, toolName)
            .orElseThrow(() -> new ToolNotFoundException("Tool not found"));
        validateTool(tool);
        return tool;
    }

    @Override
    public void validateTool(ToolEntity tool) {
        if (tool == null) {
            throw new IllegalArgumentException("Tool cannot be null");
        }
        if (!tool.isEnabled()) {
            throw new IllegalStateException("Tool is disabled");
        }
    }
}
