package com.mockgovernment.student;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "contracts")
@Getter
@Setter
public class ContractEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long studentId;
    private String contractType;
    private BigDecimal tuitionAmount;
    private String paymentStatus;
    private LocalDate startDate;
    private LocalDate endDate;
    private String academicYear;
}
