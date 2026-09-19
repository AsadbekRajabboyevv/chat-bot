package com.olima.agent.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record ChatRequest(
    /** Widget kaliti bilan kelgan so'rovda bo'sh bo'lishi mumkin — tashkilot kalitdan aniqlanadi. */
    UUID organizationId,
    UUID conversationId,
    @NotBlank String message,
    String studentId
) {}
