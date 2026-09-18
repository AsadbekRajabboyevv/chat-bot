package com.olima.auth;

import com.olima.auth.dto.LoginRequest;
import com.olima.auth.dto.LoginResponse;
import com.olima.auth.exception.InvalidCredentialsException;
import com.olima.organization.OrganizationRepository;
import com.olima.security.AuthenticatedUser;
import com.olima.security.JwtService;
import com.olima.user.UserEntity;
import com.olima.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Override
    public LoginResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid username or password"));

        if (!user.isEnabled() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid username or password");
        }

        String token = jwtService.generateToken(user);
        String organizationName = resolveOrganizationName(user.getOrganizationId());

        return new LoginResponse(token, user.getUsername(), user.getRole(), user.getOrganizationId(), organizationName);
    }

    @Override
    public LoginResponse describe(AuthenticatedUser principal) {
        String organizationName = resolveOrganizationName(principal.organizationId());
        return new LoginResponse(null, principal.username(), principal.role(), principal.organizationId(), organizationName);
    }

    private String resolveOrganizationName(java.util.UUID organizationId) {
        if (organizationId == null) {
            return null;
        }
        return organizationRepository.findById(organizationId).map(o -> o.getName()).orElse(null);
    }
}
