package com.olima.knowledge;

import com.olima.knowledge.exception.KnowledgeBaseNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

@Slf4j
@Service
@RequiredArgsConstructor
public class KnowledgeServiceImpl implements KnowledgeService {
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentParserService documentParserService;
    private final TextChunker textChunker;

    @Override
    public List<KnowledgeBaseEntity> findKnowledgeBases(UUID orgId) {
        return knowledgeBaseRepository.findByOrganizationId(orgId);
    }

    @Override
    public KnowledgeBaseEntity findKnowledgeBase(UUID id) {
        return knowledgeBaseRepository.findById(id)
                .orElseThrow(() -> new KnowledgeBaseNotFoundException("Knowledge base not found: " + id));
    }

    @Override
    public List<DocumentChunkEntity> search(UUID orgId, String query, int maxResults) {
        if (query == null || query.isBlank()) {
            return List.of();
        }

        List<String> keywords = extractKeywords(query);
        if (keywords.isEmpty()) {
            keywords = List.of(query.trim());
        }

        Map<UUID, DocumentChunkEntity> matches = new LinkedHashMap<>();
        Map<UUID, Integer> hitCount = new LinkedHashMap<>();
        for (String keyword : keywords) {
            for (DocumentChunkEntity chunk : documentChunkRepository.searchByKeyword(orgId, keyword)) {
                matches.putIfAbsent(chunk.getId(), chunk);
                hitCount.merge(chunk.getId(), 1, Integer::sum);
            }
        }

        return matches.values().stream()
                .sorted(Comparator.comparingInt((DocumentChunkEntity c) -> hitCount.getOrDefault(c.getId(), 0)).reversed())
                .limit(maxResults)
                .toList();
    }

    /**
     * Splits a natural-language question into significant terms so a chunk matching ANY
     * keyword counts as a hit; a single full-phrase substring match is too strict for LLM-generated queries.
     */
    private List<String> extractKeywords(String query) {
        return Arrays.stream(query.trim().split("[\\s,.;:!?()\\[\\]{}\"'«»]+"))
                .filter(word -> word.length() >= 3)
                .distinct()
                .limit(8)
                .toList();
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

    @Override
    public List<DocumentEntity> findDocuments(UUID knowledgeBaseId) {
        return documentRepository.findByKnowledgeBaseId(knowledgeBaseId);
    }

    @Override
    @Transactional
    public DocumentEntity uploadDocument(UUID knowledgeBaseId, MultipartFile file, String title) {
        KnowledgeBaseEntity knowledgeBase = findKnowledgeBase(knowledgeBaseId);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }

        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String defaultTitle = knowledgeBase.getName() != null && !knowledgeBase.getName().isBlank()
                ? knowledgeBase.getName() + " hujjati"
                : "Rasmiy hujjat";
        String resolvedTitle = (title != null && !title.isBlank()) ? title.trim() : cleanTitle(fileName, defaultTitle);

        DocumentEntity document = DocumentEntity.builder()
                .knowledgeBaseId(knowledgeBaseId)
                .title(resolvedTitle)
                .fileName(fileName)
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .status(DocumentProcessingStatus.PROCESSING)
                .build();

        Supplier<String> extractor = () -> {
            try {
                return documentParserService.extractText(file.getInputStream(), fileName);
            } catch (IOException e) {
                throw new UncheckedIOException("Failed to read uploaded file: " + fileName, e);
            }
        };

        return ingest(knowledgeBase, document, resolvedTitle, extractor);
    }

    @Override
    @Transactional
    public DocumentEntity uploadDocumentFromUrl(UUID knowledgeBaseId, String url, String title) {
        KnowledgeBaseEntity knowledgeBase = findKnowledgeBase(knowledgeBaseId);

        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("URL is required");
        }
        String trimmedUrl = url.trim();
        String resolvedTitle = (title != null && !title.isBlank()) ? title : trimmedUrl;

        DocumentEntity document = DocumentEntity.builder()
                .knowledgeBaseId(knowledgeBaseId)
                .title(resolvedTitle)
                .sourceUrl(trimmedUrl)
                .fileType("text/html")
                .status(DocumentProcessingStatus.PROCESSING)
                .build();

        return ingest(knowledgeBase, document, trimmedUrl, () -> documentParserService.extractTextFromUrl(trimmedUrl));
    }

    private DocumentEntity ingest(KnowledgeBaseEntity knowledgeBase, DocumentEntity document, String sourceLabel, Supplier<String> extractor) {
        try {
            String extractedText = extractor.get();
            document.setContent(extractedText);
            document.setStatus(DocumentProcessingStatus.COMPLETED);
            document = documentRepository.save(document);

            List<String> chunks = textChunker.chunk(extractedText);
            UUID organizationId = knowledgeBase.getOrganizationId();
            String citationUrl = (document.getSourceUrl() != null && !document.getSourceUrl().isBlank())
                    ? document.getSourceUrl()
                    : document.getTitle();
            for (String chunkContent : chunks) {
                DocumentChunkEntity chunk = DocumentChunkEntity.builder()
                        .documentId(document.getId())
                        .organizationId(organizationId)
                        .content(chunkContent)
                        .status(DocumentStatus.ACTIVE)
                        .version(1)
                        .sourceUrl(citationUrl)
                        .build();
                documentChunkRepository.save(chunk);
            }
            log.info("Parsed '{}' into {} chunk(s) for knowledge base {}", sourceLabel, chunks.size(), knowledgeBase.getId());
            return document;
        } catch (RuntimeException e) {
            document.setStatus(DocumentProcessingStatus.FAILED);
            document.setErrorMessage(e.getMessage());
            return documentRepository.save(document);
        }
    }

    private String cleanTitle(String raw, String defaultTitle) {
        if (raw == null || raw.isBlank()) {
            return defaultTitle;
        }
        String cleaned = stripExtension(raw);
        cleaned = cleaned.replaceAll("^\\d{8,}[_\\-\\s]*", "");
        cleaned = cleaned.replace('_', ' ').replace('-', ' ').trim();
        String lower = cleaned.toLowerCase();
        if (lower.isBlank() || lower.equals("document") || lower.equals("doc")
                || lower.equals("file") || lower.equals("fayl") || lower.equals("hujjat") || lower.equals("data")) {
            return defaultTitle;
        }
        return cleaned.substring(0, 1).toUpperCase() + cleaned.substring(1);
    }

    private String stripExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
    }
}
