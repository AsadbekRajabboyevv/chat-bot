package com.olima.knowledge;

import com.olima.knowledge.dto.UrlIngestRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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

    @GetMapping("/bases/{id}")
    public ResponseEntity<KnowledgeBaseEntity> findKnowledgeBase(@PathVariable UUID id) {
        return ResponseEntity.ok(knowledgeService.findKnowledgeBase(id));
    }

    @GetMapping("/bases/{id}/documents")
    public ResponseEntity<List<DocumentEntity>> findDocuments(@PathVariable UUID id) {
        return ResponseEntity.ok(knowledgeService.findDocuments(id));
    }

    @PostMapping("/bases/{id}/documents")
    public ResponseEntity<DocumentEntity> createDocument(@PathVariable UUID id, @RequestBody DocumentEntity document) {
        document.setKnowledgeBaseId(id);
        return ResponseEntity.ok(knowledgeService.createDocument(document));
    }

    @PostMapping(value = "/bases/{id}/documents/upload")
    public ResponseEntity<DocumentEntity> uploadDocument(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title) {
        return ResponseEntity.ok(knowledgeService.uploadDocument(id, file, title));
    }

    @PostMapping(value = "/bases/{id}/documents/url")
    public ResponseEntity<DocumentEntity> uploadDocumentFromUrl(
            @PathVariable UUID id,
            @RequestBody UrlIngestRequest request) {
        return ResponseEntity.ok(knowledgeService.uploadDocumentFromUrl(id, request.url(), request.title()));
    }
}
