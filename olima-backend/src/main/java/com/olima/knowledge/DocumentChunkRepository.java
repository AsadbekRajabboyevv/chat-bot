package com.olima.knowledge;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DocumentChunkRepository extends JpaRepository<DocumentChunkEntity, UUID> {
    
    @Query("SELECT c FROM DocumentChunkEntity c WHERE c.organizationId = :orgId AND c.status = 'ACTIVE' AND LOWER(c.content) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<DocumentChunkEntity> searchByKeyword(@Param("orgId") UUID orgId, @Param("query") String query);
    
    List<DocumentChunkEntity> findByOrganizationIdAndStatus(UUID orgId, DocumentStatus status);
}
