package com.olima.telegram;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TelegramConversationRepository extends JpaRepository<TelegramConversationEntity, UUID> {
    Optional<TelegramConversationEntity> findByOrganizationIdAndTelegramChatId(UUID organizationId, Long telegramChatId);
}
