package com.olima.user;

import com.olima.user.dto.CreateUserRequest;
import com.olima.user.dto.UserResponse;

import java.util.List;
import java.util.UUID;

public interface UserService {
    List<UserResponse> findAll();
    UserResponse create(CreateUserRequest request);
    void delete(UUID id);
}
