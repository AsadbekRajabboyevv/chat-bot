package com.olima.tool.dto;

import com.olima.tool.AccessLevel;
import com.olima.tool.ToolType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ToolRequest(
    @NotBlank String name,
    @NotBlank String description,
    @NotNull ToolType type,
    String configuration,
    boolean requiresConfirmation,
    AccessLevel accessLevel,
    List<ToolParameterRequest> parameters
) {}
