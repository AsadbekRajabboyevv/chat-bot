package com.olima.security;

import com.olima.user.UserEntity;
import com.olima.user.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtService {

    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_ORG_ID = "orgId";
    private static final String CLAIM_USER_ID = "userId";

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${jwt.secret}") String secret, @Value("${jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(UserEntity user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        var builder = Jwts.builder()
                .subject(user.getUsername())
                .claim(CLAIM_USER_ID, user.getId().toString())
                .claim(CLAIM_ROLE, user.getRole().name())
                .issuedAt(now)
                .expiration(expiry);

        if (user.getOrganizationId() != null) {
            builder.claim(CLAIM_ORG_ID, user.getOrganizationId().toString());
        }

        return builder.signWith(key).compact();
    }

    public AuthenticatedUser parseToken(String token) throws JwtException {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        UUID userId = UUID.fromString(claims.get(CLAIM_USER_ID, String.class));
        String username = claims.getSubject();
        UserRole role = UserRole.valueOf(claims.get(CLAIM_ROLE, String.class));
        String orgIdStr = claims.get(CLAIM_ORG_ID, String.class);
        UUID organizationId = orgIdStr != null ? UUID.fromString(orgIdStr) : null;

        return new AuthenticatedUser(userId, username, role, organizationId);
    }
}
