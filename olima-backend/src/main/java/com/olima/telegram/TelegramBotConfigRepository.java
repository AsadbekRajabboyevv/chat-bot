package com.olima.telegram;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TelegramBotConfigRepository extends JpaRepository<TelegramBotConfigEntity, UUID> {
    Optional<TelegramBotConfigEntity> findByOrganizationId(UUID organizationId);
    Optional<TelegramBotConfigEntity> findByWebhookSecret(String webhookSecret);
}
