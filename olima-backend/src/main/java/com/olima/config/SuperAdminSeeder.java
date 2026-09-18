package com.olima.config;

import com.olima.user.UserEntity;
import com.olima.user.UserRepository;
import com.olima.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Ensures a platform SUPER_ADMIN account exists on startup. The password is hashed here
 * (rather than baked into a Liquibase seed) so it always matches whatever PasswordEncoder
 * the app is actually running with.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SuperAdminSeeder implements ApplicationRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.default-super-admin.username}")
    private String defaultUsername;

    @Value("${app.default-super-admin.password}")
    private String defaultPassword;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsername(defaultUsername)) {
            return;
        }

        UserEntity superAdmin = UserEntity.builder()
                .username(defaultUsername)
                .passwordHash(passwordEncoder.encode(defaultPassword))
                .role(UserRole.SUPER_ADMIN)
                .organizationId(null)
                .enabled(true)
                .build();

        userRepository.save(superAdmin);
        log.info("Seeded default super admin user '{}'", defaultUsername);
    }
}
