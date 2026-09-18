package com.olima.user.dto;

import com.olima.user.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateUserRequest(
    @NotBlank String username,
    @NotBlank @Size(min = 4) String password,
    @NotNull UserRole role,
    UUID organizationId
) {}
