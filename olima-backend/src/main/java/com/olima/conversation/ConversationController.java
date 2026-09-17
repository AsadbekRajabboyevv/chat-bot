package com.olima.conversation;

import com.olima.conversation.dto.ConversationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/conversations")
@RequiredArgsConstructor
public class ConversationController {
    private final ConversationService conversationService;

    @GetMapping
    public ResponseEntity<List<ConversationResponse>> findByOrganization(@RequestParam UUID organizationId) {
        return ResponseEntity.ok(conversationService.findByOrganization(organizationId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConversationResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(conversationService.findById(id));
    }
}
