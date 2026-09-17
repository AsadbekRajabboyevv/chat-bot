package com.mockgovernment.education;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "academic_leave_rules")
@Getter
@Setter
public class AcademicLeaveRuleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private String description;
    private String validReasons;
    private Integer maxDurationYears;
    private String requiredDocuments;
    private String reinstatementProcedure;
}
