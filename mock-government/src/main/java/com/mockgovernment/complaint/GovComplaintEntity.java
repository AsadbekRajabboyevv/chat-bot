package com.mockgovernment.complaint;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "gov_complaints")
@Getter
@Setter
public class GovComplaintEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String subject;
    private String description;
    private String category;
    private String status;
    private String applicantName;
    private String applicantEmail;
    private String applicantPhone;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
