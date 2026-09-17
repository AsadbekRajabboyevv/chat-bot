package com.olima.knowledge;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/knowledge")
@RequiredArgsConstructor
public class KnowledgeController {
    private final KnowledgeService knowledgeService;

    @GetMapping("/bases")
    public ResponseEntity<List<KnowledgeBaseEntity>> findKnowledgeBases(@RequestParam UUID organizationId) {
        return ResponseEntity.ok(knowledgeService.findKnowledgeBases(organizationId));
    }

    @PostMapping("/bases")
    public ResponseEntity<KnowledgeBaseEntity> createKnowledgeBase(@RequestBody KnowledgeBaseEntity knowledgeBase) {
        return ResponseEntity.ok(knowledgeService.createKnowledgeBase(knowledgeBase));
    }

    @GetMapping("/bases/{id}/documents")
    public ResponseEntity<List<DocumentEntity>> findDocuments(@PathVariable UUID id) {
        return ResponseEntity.ok(List.of()); // Not fully implemented in service, returning empty list
    }

    @PostMapping("/bases/{id}/documents")
    public ResponseEntity<DocumentEntity> createDocument(@PathVariable UUID id, @RequestBody DocumentEntity document) {
        document.setKnowledgeBaseId(id);
        return ResponseEntity.ok(knowledgeService.createDocument(document));
    }
}
