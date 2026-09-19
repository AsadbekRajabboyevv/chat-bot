package com.olima.telegram;

import com.olima.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "telegram_bot_configs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelegramBotConfigEntity extends BaseEntity {
    private UUID organizationId;

    @Column(name = "bot_token")
    private String botToken;

    @Column(name = "bot_username")
    private String botUsername;

    @Column(name = "webhook_secret")
    private String webhookSecret;

    @Builder.Default
    private boolean enabled = true;
}
