package com.olima.organization.dto;

import jakarta.validation.constraints.Size;

/** Tashkilot admini o'zi o'zgartira oladigan widget sozlamalari. */
public record WidgetSettingsRequest(
    @Size(max = 300, message = "Salomlashish matni 300 belgidan oshmasligi kerak") String greeting,
    boolean greetingEnabled
) {}
