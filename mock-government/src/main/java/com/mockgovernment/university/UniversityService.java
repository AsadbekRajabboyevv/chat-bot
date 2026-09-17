package com.mockgovernment.university;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UniversityService {

    private final UniversityRepository universityRepository;

    public List<UniversityResponse> getAllUniversities() {
        return universityRepository.findAll().stream()
                .map(e -> new UniversityResponse(
                        e.getId(), e.getName(), e.getCode(), e.getLocation(),
                        e.getType(), e.getAccreditationStatus(), e.getEstablishedYear(),
                        e.getStudentCount(), e.getWebsite(), e.getFaculties()
                ))
                .toList();
    }
}
