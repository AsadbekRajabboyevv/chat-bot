package com.olima.organization.dto;

import jakarta.validation.constraints.NotBlank;

public record OrganizationRequest(
    @NotBlank String name,
    String description
) {}
