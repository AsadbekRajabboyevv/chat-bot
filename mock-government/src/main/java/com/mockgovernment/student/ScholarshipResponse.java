package com.mockgovernment.student;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ScholarshipResponse(
        Long id,
        Long studentId,
        String scholarshipType,
        BigDecimal amount,
        String currency,
        String conditions,
        LocalDate startDate,
        LocalDate endDate,
        Boolean active
) {}
