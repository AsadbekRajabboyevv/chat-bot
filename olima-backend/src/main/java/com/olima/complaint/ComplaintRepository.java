package com.olima.complaint;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ComplaintRepository extends JpaRepository<ComplaintEntity, UUID> {
    List<ComplaintEntity> findByOrganizationIdOrderByCreatedAtDesc(UUID orgId);
    List<ComplaintEntity> findByConversationId(UUID convId);
}
