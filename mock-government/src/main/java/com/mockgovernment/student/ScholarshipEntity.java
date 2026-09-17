package com.mockgovernment.student;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "scholarships")
@Getter
@Setter
public class ScholarshipEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long studentId;
    private String scholarshipType;
    private BigDecimal amount;
    private String currency;
    private String conditions;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean active;
}
