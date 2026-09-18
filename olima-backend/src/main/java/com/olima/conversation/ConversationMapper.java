package com.olima.conversation;

import com.olima.conversation.dto.ConversationResponse;
import com.olima.conversation.dto.MessageResponse;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class ConversationMapper {
    public ConversationResponse toResponse(ConversationEntity entity) {
        List<MessageResponse> messages = (entity.getMessages() != null && Hibernate.isInitialized(entity.getMessages()))
            ? entity.getMessages().stream()
                .map(this::toMessageResponse)
                .collect(Collectors.toList())
            : List.of();

        return new ConversationResponse(
            entity.getId(),
            entity.getOrganizationId(),
            entity.getTitle(),
            messages,
            entity.getCreatedAt()
        );
    }

    private MessageResponse toMessageResponse(MessageEntity entity) {
        return new MessageResponse(
            entity.getId(),
            entity.getRole(),
            entity.getContent(),
            entity.getToolCallId(),
            entity.getToolName(),
            entity.getCreatedAt()
        );
    }
}
