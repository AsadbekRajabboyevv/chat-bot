package com.olima.auth.dto;

import com.olima.user.UserRole;

import java.util.UUID;

public record LoginResponse(
    String token,
    String username,
    UserRole role,
    UUID organizationId,
    String organizationName
) {}
