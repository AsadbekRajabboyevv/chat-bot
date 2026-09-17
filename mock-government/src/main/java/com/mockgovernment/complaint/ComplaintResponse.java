package com.mockgovernment.complaint;

import java.time.LocalDateTime;

public record ComplaintResponse(
        Long id,
        String subject,
        String description,
        String category,
        String status,
        String applicantName,
        String applicantEmail,
        String applicantPhone,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
