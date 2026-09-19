package com.olima.user;

import com.olima.organization.OrganizationRepository;
import com.olima.organization.exception.OrganizationNotFoundException;
import com.olima.user.dto.CreateUserRequest;
import com.olima.user.dto.ResetPasswordRequest;
import com.olima.user.dto.UserResponse;
import com.olima.user.exception.DuplicateUsernameException;
import com.olima.user.exception.UserNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<UserResponse> findAll() {
        List<UserEntity> users = userRepository.findAll();
        Map<UUID, String> orgNames = organizationRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(o -> o.getId(), o -> o.getName()));

        return users.stream()
                .map(u -> toResponse(u, u.getOrganizationId() != null ? orgNames.get(u.getOrganizationId()) : null))
                .toList();
    }

    @Override
    public UserResponse create(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new DuplicateUsernameException("Username already taken: " + request.username());
        }

        String organizationName = null;
        if (request.role() == UserRole.ORG_ADMIN) {
            if (request.organizationId() == null) {
                throw new IllegalArgumentException("organizationId is required for ORG_ADMIN users");
            }
            organizationName = organizationRepository.findById(request.organizationId())
                    .orElseThrow(() -> new OrganizationNotFoundException("Organization not found: " + request.organizationId()))
                    .getName();
        }

        UserEntity user = UserEntity.builder()
                .username(request.username())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(request.role())
                .organizationId(request.role() == UserRole.ORG_ADMIN ? request.organizationId() : null)
                .enabled(true)
                .build();

        user = userRepository.save(user);
        return toResponse(user, organizationName);
    }

    /**
     * Parol xeshlangan holda saqlanadi, ya'ni eskisini ko'rsatib bo'lmaydi — yagona yo'l
     * yangisini o'rnatish. Busiz panel hisobni o'chirib qaytadan yaratishga majbur bo'lardi:
     * o'chirish ishlab, yaratish yiqilsa mijoz kirish huquqini butunlay yo'qotardi.
     */
    @Override
    public UserResponse resetPassword(UUID id, ResetPasswordRequest request) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + id));

        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user = userRepository.save(user);

        String organizationName = user.getOrganizationId() == null ? null
                : organizationRepository.findById(user.getOrganizationId())
                        .map(o -> o.getName())
                        .orElse(null);

        return toResponse(user, organizationName);
    }

    @Override
    public void delete(UUID id) {
        if (!userRepository.existsById(id)) {
            throw new UserNotFoundException("User not found: " + id);
        }
        userRepository.deleteById(id);
    }

    private UserResponse toResponse(UserEntity user, String organizationName) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.getOrganizationId(),
                organizationName,
                user.isEnabled(),
                user.getCreatedAt()
        );
    }
}
