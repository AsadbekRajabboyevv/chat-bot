package com.mockgovernment.university;

public record UniversityResponse(
        Long id,
        String name,
        String code,
        String location,
        String type,
        String accreditationStatus,
        Integer establishedYear,
        Integer studentCount,
        String website,
        String faculties
) {}
