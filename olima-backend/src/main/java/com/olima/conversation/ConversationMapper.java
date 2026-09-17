package com.olima.conversation;

import com.olima.conversation.dto.ConversationResponse;
import com.olima.conversation.dto.MessageResponse;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class ConversationMapper {
    public ConversationResponse toResponse(ConversationEntity entity) {
        return new ConversationResponse(
            entity.getId(),
            entity.getOrganizationId(),
            entity.getTitle(),
            entity.getMessages().stream()
                .map(this::toMessageResponse)
                .collect(Collectors.toList()),
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
