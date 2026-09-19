package com.olima.user;

import com.olima.user.dto.CreateUserRequest;
import com.olima.user.dto.ResetPasswordRequest;
import com.olima.user.dto.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Manages admin accounts (organization admins). Restricted to SUPER_ADMIN — creating or
 * removing who can log in is a platform-level concern, not something an org admin does.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class UserController {
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserResponse>> findAll() {
        return ResponseEntity.ok(userService.findAll());
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@RequestBody @Valid CreateUserRequest request) {
        return ResponseEntity.ok(userService.create(request));
    }

    /** Parolni almashtirish. Yangi parol javobda qaytmaydi — uni chaqiruvchi o'zi biladi. */
    @PutMapping("/{id}/password")
    public ResponseEntity<UserResponse> resetPassword(@PathVariable UUID id,
                                                      @RequestBody @Valid ResetPasswordRequest request) {
        return ResponseEntity.ok(userService.resetPassword(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        userService.delete(id);
        return ResponseEntity.ok().build();
    }
}
