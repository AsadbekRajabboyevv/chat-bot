package com.mockgovernment.student;

import java.math.BigDecimal;
import java.time.LocalDate;

public record StudentResponse(
        Long id,
        String firstName,
        String lastName,
        String studentIdNumber,
        String universityName,
        String faculty,
        Integer course,
        BigDecimal gpa,
        String enrollmentStatus,
        LocalDate enrollmentDate,
        String email,
        String phone
) {}
