package com.olima.agent.dto;

import com.olima.execution.ExecutionStatus;

public record ToolCallInfo(
    String toolName,
    String input,
    String output,
    ExecutionStatus status,
    long durationMs
) {}
