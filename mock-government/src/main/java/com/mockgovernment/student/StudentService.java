package com.mockgovernment.student;

import com.mockgovernment.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final ContractRepository contractRepository;
    private final ScholarshipRepository scholarshipRepository;

    public StudentResponse getStudentByIdNumber(String studentIdNumber) {
        return studentRepository.findByStudentIdNumber(studentIdNumber)
                .map(e -> new StudentResponse(
                        e.getId(), e.getFirstName(), e.getLastName(), e.getStudentIdNumber(),
                        e.getUniversityName(), e.getFaculty(), e.getCourse(), e.getGpa(),
                        e.getEnrollmentStatus(), e.getEnrollmentDate(), e.getEmail(), e.getPhone()
                ))
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
    }

    public ContractResponse getContractByStudentIdNumber(String studentIdNumber) {
        StudentEntity student = studentRepository.findByStudentIdNumber(studentIdNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        return contractRepository.findByStudentId(student.getId())
                .map(e -> new ContractResponse(
                        e.getId(), e.getStudentId(), e.getContractType(), e.getTuitionAmount(),
                        e.getPaymentStatus(), e.getStartDate(), e.getEndDate(), e.getAcademicYear()
                ))
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found"));
    }

    public List<ScholarshipResponse> getScholarshipsByStudentIdNumber(String studentIdNumber) {
        StudentEntity student = studentRepository.findByStudentIdNumber(studentIdNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        return scholarshipRepository.findByStudentIdAndActiveTrue(student.getId()).stream()
                .map(e -> new ScholarshipResponse(
                        e.getId(), e.getStudentId(), e.getScholarshipType(), e.getAmount(),
                        e.getCurrency(), e.getConditions(), e.getStartDate(), e.getEndDate(), e.getActive()
                ))
                .toList();
    }
}
