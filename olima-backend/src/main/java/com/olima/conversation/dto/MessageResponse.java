package com.olima.conversation.dto;

import com.olima.conversation.MessageRole;

import java.time.Instant;
import java.util.UUID;

public record MessageResponse(
    UUID id,
    MessageRole role,
    String content,
    String toolCallId,
    String toolName,
    Instant createdAt
) {}
