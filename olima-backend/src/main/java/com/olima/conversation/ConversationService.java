package com.olima.conversation;

import com.olima.conversation.dto.ConversationResponse;
import java.util.List;
import java.util.UUID;

public interface ConversationService {
    ConversationResponse createConversation(UUID orgId, String title);
    void addMessage(UUID convId, MessageRole role, String content, String toolCallId, String toolName);
    ConversationResponse findById(UUID id);
    List<ConversationResponse> findByOrganization(UUID orgId);
}
