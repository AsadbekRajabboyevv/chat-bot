package com.olima.agent;

import com.olima.agent.dto.ChatRequest;
import com.olima.agent.dto.ChatResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class AgentController {
    private final AgentService agentService;

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody @Valid ChatRequest request) {
        return ResponseEntity.ok(agentService.chat(request));
    }

    @PostMapping(value = "/chat/stream")
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter chatStream(@RequestBody @Valid ChatRequest request) {
        return agentService.chatStream(request);
    }

    @PostMapping("/chat/confirm")
    public ResponseEntity<ChatResponse> confirmAction(
            @RequestParam UUID conversationId,
            @RequestParam UUID complaintId) {
        return ResponseEntity.ok(agentService.confirmAction(conversationId, complaintId));
    }
}
