package com.olima.knowledge;

import java.util.List;
import java.util.UUID;

public interface KnowledgeService {
    List<KnowledgeBaseEntity> findKnowledgeBases(UUID orgId);
    List<DocumentChunkEntity> search(UUID orgId, String query, int maxResults);
    KnowledgeBaseEntity createKnowledgeBase(KnowledgeBaseEntity knowledgeBase);
    DocumentEntity createDocument(DocumentEntity document);
    DocumentChunkEntity createChunk(DocumentChunkEntity chunk);
}
