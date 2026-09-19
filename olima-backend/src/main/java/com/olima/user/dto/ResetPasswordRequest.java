package com.olima.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
    @NotBlank @Size(min = 4) String password
) {}
