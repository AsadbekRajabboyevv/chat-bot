package com.olima.execution;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ToolExecutionRepository extends JpaRepository<ToolExecutionEntity, UUID> {
    List<ToolExecutionEntity> findByOrganizationIdOrderByCreatedAtDesc(UUID orgId);
    List<ToolExecutionEntity> findByConversationIdOrderByCreatedAtDesc(UUID conversationId);
}
