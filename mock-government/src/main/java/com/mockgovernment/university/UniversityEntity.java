package com.mockgovernment.university;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "universities")
@Getter
@Setter
public class UniversityEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String code;
    private String location;
    private String type;
    private String accreditationStatus;
    private Integer establishedYear;
    private Integer studentCount;
    private String website;
    private String faculties;
}
