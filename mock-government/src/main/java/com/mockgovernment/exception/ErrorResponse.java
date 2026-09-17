package com.mockgovernment.exception;

public record ErrorResponse(
        int status,
        String message,
        long timestamp
) {}
