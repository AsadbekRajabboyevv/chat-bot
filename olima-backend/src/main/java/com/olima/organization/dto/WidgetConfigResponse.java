package com.olima.organization.dto;

/**
 * Widget mijoz saytida yuklanganda oladigan ochiq sozlamalar.
 * Faqat ko'rinish uchun kerakli maydonlar — kalit, id va boshqa ichki ma'lumot bu yerga tushmaydi.
 */
public record WidgetConfigResponse(
    String greeting,
    boolean greetingEnabled
) {}
