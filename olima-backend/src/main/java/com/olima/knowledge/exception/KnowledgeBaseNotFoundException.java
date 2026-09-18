package com.olima.knowledge.exception;

public class KnowledgeBaseNotFoundException extends RuntimeException {
    public KnowledgeBaseNotFoundException(String message) {
        super(message);
    }
}
