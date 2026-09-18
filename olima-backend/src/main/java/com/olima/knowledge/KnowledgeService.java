package com.olima.knowledge;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface KnowledgeService {
    List<KnowledgeBaseEntity> findKnowledgeBases(UUID orgId);
    KnowledgeBaseEntity findKnowledgeBase(UUID id);
    List<DocumentChunkEntity> search(UUID orgId, String query, int maxResults);
    KnowledgeBaseEntity createKnowledgeBase(KnowledgeBaseEntity knowledgeBase);
    DocumentEntity createDocument(DocumentEntity document);
    DocumentChunkEntity createChunk(DocumentChunkEntity chunk);
    List<DocumentEntity> findDocuments(UUID knowledgeBaseId);
    DocumentEntity uploadDocument(UUID knowledgeBaseId, MultipartFile file, String title);
    DocumentEntity uploadDocumentFromUrl(UUID knowledgeBaseId, String url, String title);
}
