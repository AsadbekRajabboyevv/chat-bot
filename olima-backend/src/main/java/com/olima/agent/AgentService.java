package com.olima.agent;

import com.olima.agent.dto.ChatRequest;
import com.olima.agent.dto.ChatResponse;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.UUID;

public interface AgentService {
    ChatResponse chat(ChatRequest request);
    SseEmitter chatStream(ChatRequest request);
    ChatResponse confirmAction(UUID conversationId, UUID complaintId);
}
