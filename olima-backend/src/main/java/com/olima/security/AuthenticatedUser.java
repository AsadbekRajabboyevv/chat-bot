package com.olima.security;

import com.olima.user.UserRole;

import java.util.UUID;

/**
 * The JWT-derived principal attached to the security context for every authenticated request.
 */
public record AuthenticatedUser(UUID userId, String username, UserRole role, UUID organizationId) {

    public boolean isSuperAdmin() {
        return role == UserRole.SUPER_ADMIN;
    }
}
