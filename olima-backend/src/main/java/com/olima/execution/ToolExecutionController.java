package com.olima.execution;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/executions")
@RequiredArgsConstructor
public class ToolExecutionController {
    private final ToolExecutionService service;

    @GetMapping(params = "organizationId")
    public ResponseEntity<List<ToolExecutionEntity>> findByOrganization(@RequestParam UUID organizationId) {
        return ResponseEntity.ok(service.findByOrganization(organizationId));
    }

    @GetMapping(params = "conversationId")
    public ResponseEntity<List<ToolExecutionEntity>> findByConversation(@RequestParam UUID conversationId) {
        return ResponseEntity.ok(service.findByConversation(conversationId));
    }
}
