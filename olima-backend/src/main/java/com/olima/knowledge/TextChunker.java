package com.olima.knowledge;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Splits extracted document text into overlapping chunks sized for retrieval,
 * preferring to break on paragraph boundaries so a chunk reads as a coherent unit.
 */
@Component
public class TextChunker {

    private static final int DEFAULT_CHUNK_SIZE = 1500;
    private static final int DEFAULT_OVERLAP = 150;

    public List<String> chunk(String text) {
        return chunk(text, DEFAULT_CHUNK_SIZE, DEFAULT_OVERLAP);
    }

    public List<String> chunk(String text, int chunkSize, int overlap) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return chunks;
        }

        String[] paragraphs = text.replace("\r\n", "\n").trim().split("\n\\s*\n");
        StringBuilder current = new StringBuilder();

        for (String rawParagraph : paragraphs) {
            String paragraph = rawParagraph.trim();
            if (paragraph.isEmpty()) {
                continue;
            }

            if (paragraph.length() > chunkSize) {
                if (current.length() > 0) {
                    chunks.add(current.toString().trim());
                    current.setLength(0);
                }
                chunks.addAll(splitOversizedParagraph(paragraph, chunkSize, overlap));
                continue;
            }

            if (current.length() > 0 && current.length() + paragraph.length() + 2 > chunkSize) {
                chunks.add(current.toString().trim());
                current = new StringBuilder(overlapTail(current.toString(), overlap));
            }

            if (current.length() > 0) {
                current.append("\n\n");
            }
            current.append(paragraph);
        }

        if (!current.toString().isBlank()) {
            chunks.add(current.toString().trim());
        }

        return chunks;
    }

    private List<String> splitOversizedParagraph(String paragraph, int chunkSize, int overlap) {
        List<String> pieces = new ArrayList<>();
        int start = 0;
        while (start < paragraph.length()) {
            int end = Math.min(start + chunkSize, paragraph.length());
            pieces.add(paragraph.substring(start, end).trim());
            if (end == paragraph.length()) {
                break;
            }
            start = end - overlap;
        }
        return pieces;
    }

    private String overlapTail(String text, int overlap) {
        if (text.length() <= overlap) {
            return text;
        }
        return text.substring(text.length() - overlap);
    }
}
