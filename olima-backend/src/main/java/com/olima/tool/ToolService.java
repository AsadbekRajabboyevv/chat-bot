package com.olima.tool;

import com.olima.tool.dto.ToolRequest;
import com.olima.tool.dto.ToolResponse;
import java.util.List;
import java.util.UUID;

public interface ToolService {
    List<ToolResponse> findByOrganization(UUID orgId);
    ToolResponse findById(UUID id);
    ToolResponse create(UUID orgId, ToolRequest request);
    ToolResponse update(UUID id, ToolRequest request);
    void delete(UUID id);
    ToolResponse toggleEnabled(UUID id, boolean enabled);
}
