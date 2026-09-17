package com.olima.conversation;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<ConversationEntity, UUID> {
    List<ConversationEntity> findByOrganizationIdOrderByCreatedAtDesc(UUID orgId);
}
