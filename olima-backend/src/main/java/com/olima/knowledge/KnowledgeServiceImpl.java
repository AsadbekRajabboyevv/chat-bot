package com.olima.knowledge;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KnowledgeServiceImpl implements KnowledgeService {
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;

    @Override
    public List<KnowledgeBaseEntity> findKnowledgeBases(UUID orgId) {
        return knowledgeBaseRepository.findByOrganizationId(orgId);
    }

    @Override
    public List<DocumentChunkEntity> search(UUID orgId, String query, int maxResults) {
        return documentChunkRepository.searchByKeyword(orgId, query).stream()
                .limit(maxResults)
                .collect(Collectors.toList());
    }

    @Override
    public KnowledgeBaseEntity createKnowledgeBase(KnowledgeBaseEntity knowledgeBase) {
        return knowledgeBaseRepository.save(knowledgeBase);
    }

    @Override
    public DocumentEntity createDocument(DocumentEntity document) {
        return documentRepository.save(document);
    }

    @Override
    public DocumentChunkEntity createChunk(DocumentChunkEntity chunk) {
        return documentChunkRepository.save(chunk);
    }
}
