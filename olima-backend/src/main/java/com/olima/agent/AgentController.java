package com.olima.agent;

import com.olima.agent.dto.ChatRequest;
import com.olima.agent.dto.ChatResponse;
import com.olima.security.WidgetKeyFilter;
import jakarta.servlet.http.HttpServletRequest;
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
    public ResponseEntity<ChatResponse> chat(@RequestBody @Valid ChatRequest request,
                                             HttpServletRequest http) {
        return ResponseEntity.ok(agentService.chat(scoped(request, http)));
    }

    @PostMapping(value = "/chat/stream")
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter chatStream(
            @RequestBody @Valid ChatRequest request, HttpServletRequest http) {
        return agentService.chatStream(scoped(request, http));
    }

    @PostMapping("/chat/confirm")
    public ResponseEntity<ChatResponse> confirmAction(
            @RequestParam UUID conversationId,
            @RequestParam UUID complaintId) {
        return ResponseEntity.ok(agentService.confirmAction(conversationId, complaintId));
    }

    /**
     * So'rov widget kaliti bilan kelgan bo'lsa, tanadagi organizationId BEKOR QILINADI va
     * kalitdan aniqlangan tashkilot qo'yiladi.
     *
     * Bu shu yechimning butun mohiyati: widget mijoz saytida ochiq turadi, ya'ni tanasidagi
     * har qanday qiymat o'zgartirilishi mumkin. Kalit -> tashkilot bog'lanishi esa faqat
     * bazada, server tomonda.
     */
    private ChatRequest scoped(ChatRequest request, HttpServletRequest http) {
        Object orgId = http.getAttribute(WidgetKeyFilter.WIDGET_ORG_ATTR);
        if (orgId instanceof UUID widgetOrgId) {
            if (!widgetOrgId.equals(request.organizationId())) {
                return new ChatRequest(widgetOrgId, request.conversationId(), request.message(), request.studentId());
            }
            return request;
        }
        if (request.organizationId() == null) {
            throw new IllegalArgumentException("organizationId is required when no widget key is supplied");
        }
        return request;
    }
}
