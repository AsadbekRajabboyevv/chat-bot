package com.mockgovernment.student;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "students")
@Getter
@Setter
public class StudentEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String firstName;
    private String lastName;
    private String studentIdNumber;
    private String universityName;
    private String faculty;
    private Integer course;
    private BigDecimal gpa;
    private String enrollmentStatus;
    private LocalDate enrollmentDate;
    private String email;
    private String phone;
}
