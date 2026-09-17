package com.mockgovernment.student;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;

    @GetMapping("/{id}")
    public StudentResponse getStudent(@PathVariable("id") String studentIdNumber) {
        return studentService.getStudentByIdNumber(studentIdNumber);
    }

    @GetMapping("/{id}/contract")
    public ContractResponse getContract(@PathVariable("id") String studentIdNumber) {
        return studentService.getContractByStudentIdNumber(studentIdNumber);
    }

    @GetMapping("/{id}/scholarship")
    public List<ScholarshipResponse> getScholarships(@PathVariable("id") String studentIdNumber) {
        return studentService.getScholarshipsByStudentIdNumber(studentIdNumber);
    }
}
