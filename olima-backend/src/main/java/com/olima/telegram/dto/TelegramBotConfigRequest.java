package com.olima.telegram.dto;

import jakarta.validation.constraints.NotBlank;

public record TelegramBotConfigRequest(
    @NotBlank String botToken
) {}
