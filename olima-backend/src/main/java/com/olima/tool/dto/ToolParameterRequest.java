package com.olima.tool.dto;

import jakarta.validation.constraints.NotBlank;

public record ToolParameterRequest(
    @NotBlank String name,
    @NotBlank String type,
    String description,
    boolean required,
    String defaultValue
) {}
