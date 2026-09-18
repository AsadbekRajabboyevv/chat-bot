package com.olima.conversation;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<ConversationEntity, UUID> {
    @EntityGraph(attributePaths = {"messages"})
    List<ConversationEntity> findByOrganizationIdOrderByCreatedAtDesc(UUID orgId);

    @EntityGraph(attributePaths = {"messages"})
    @Override
    Optional<ConversationEntity> findById(UUID id);
}
