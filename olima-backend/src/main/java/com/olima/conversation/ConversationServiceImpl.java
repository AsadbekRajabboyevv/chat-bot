package com.olima.conversation;

import com.olima.conversation.dto.ConversationResponse;
import com.olima.conversation.exception.ConversationNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConversationServiceImpl implements ConversationService {
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ConversationMapper conversationMapper;

    @Override
    @Transactional
    public ConversationResponse createConversation(UUID orgId, String title) {
        ConversationEntity entity = ConversationEntity.builder()
            .organizationId(orgId)
            .title(title)
            .build();
        return conversationMapper.toResponse(conversationRepository.save(entity));
    }

    @Override
    @Transactional
    public void addMessage(UUID convId, MessageRole role, String content, String toolCallId, String toolName) {
        ConversationEntity conv = conversationRepository.findById(convId)
            .orElseThrow(() -> new ConversationNotFoundException("Conversation not found"));
        MessageEntity message = MessageEntity.builder()
            .conversation(conv)
            .role(role)
            .content(content)
            .toolCallId(toolCallId)
            .toolName(toolName)
            .build();
        messageRepository.save(message);
    }

    @Override
    public ConversationResponse findById(UUID id) {
        return conversationRepository.findById(id)
            .map(conversationMapper::toResponse)
            .orElseThrow(() -> new ConversationNotFoundException("Conversation not found"));
    }

    @Override
    public List<ConversationResponse> findByOrganization(UUID orgId) {
        return conversationRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId).stream()
            .map(conversationMapper::toResponse)
            .toList();
    }
}
