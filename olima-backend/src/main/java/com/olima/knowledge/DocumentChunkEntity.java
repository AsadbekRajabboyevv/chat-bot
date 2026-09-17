package com.olima.knowledge;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "document_chunks")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChunkEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    private UUID documentId;
    private UUID organizationId;
    private String content;
    private String documentNumber;
    private String article;
    private String paragraph;
    
    @Enumerated(EnumType.STRING)
    private DocumentStatus status;
    
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private Integer version;
    private String sourceUrl;
    
    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private Instant createdAt;
}
