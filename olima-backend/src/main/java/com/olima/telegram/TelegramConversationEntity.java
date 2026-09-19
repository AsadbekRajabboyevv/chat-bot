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

/** Links a Telegram chat to an internal conversation so multi-turn context survives between messages. */
@Entity
@Table(name = "telegram_conversations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelegramConversationEntity extends BaseEntity {
    private UUID organizationId;

    @Column(name = "telegram_chat_id")
    private Long telegramChatId;

    @Column(name = "conversation_id")
    private UUID conversationId;
}
