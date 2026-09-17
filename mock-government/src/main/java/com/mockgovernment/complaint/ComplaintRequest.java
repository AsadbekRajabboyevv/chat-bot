package com.mockgovernment.complaint;

public record ComplaintRequest(
        String subject,
        String description,
        String category,
        String applicantName,
        String applicantEmail,
        String applicantPhone
) {}
