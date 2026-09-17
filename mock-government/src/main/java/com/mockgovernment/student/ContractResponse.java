package com.mockgovernment.student;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContractResponse(
        Long id,
        Long studentId,
        String contractType,
        BigDecimal tuitionAmount,
        String paymentStatus,
        LocalDate startDate,
        LocalDate endDate,
        String academicYear
) {}
