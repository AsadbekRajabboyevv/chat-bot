package com.mockgovernment.education;

import java.math.BigDecimal;

public record TransferRuleResponse(
        Long id,
        String title,
        String description,
        BigDecimal minGpa,
        Integer minCompletedYears,
        String applicationPeriod,
        String requiredDocuments,
        String additionalConditions
) {}
