package com.mockgovernment.education;

public record AcademicLeaveRuleResponse(
        Long id,
        String title,
        String description,
        String validReasons,
        Integer maxDurationYears,
        String requiredDocuments,
        String reinstatementProcedure
) {}
