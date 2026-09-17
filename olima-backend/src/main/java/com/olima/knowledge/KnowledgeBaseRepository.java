package com.olima.knowledge;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBaseEntity, UUID> {
    List<KnowledgeBaseEntity> findByOrganizationId(UUID orgId);
}
