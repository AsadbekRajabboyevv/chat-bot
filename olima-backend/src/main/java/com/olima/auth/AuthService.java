package com.olima.auth;

import com.olima.auth.dto.LoginRequest;
import com.olima.auth.dto.LoginResponse;
import com.olima.security.AuthenticatedUser;

public interface AuthService {
    LoginResponse login(LoginRequest request);
    LoginResponse describe(AuthenticatedUser principal);
}
