package com.mockgovernment.education;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Entity
@Table(name = "transfer_rules")
@Getter
@Setter
public class TransferRuleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private String description;
    private BigDecimal minGpa;
    private Integer minCompletedYears;
    private String applicationPeriod;
    private String requiredDocuments;
    private String additionalConditions;
}
