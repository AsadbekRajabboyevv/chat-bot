package com.olima.agent.dto;

import java.util.List;
import java.util.UUID;

public record ChatStreamEvent(
    EventType type,
    String content,
    ToolCallInfo toolCall,
    List<String> sources,
    UUID conversationId,
    boolean confirmationRequired,
    UUID pendingComplaintId
) {
    public enum EventType {
        INIT,
        TOOL_CALL,
        CONTENT,
        COMPLETE,
        ERROR
    }

    public static ChatStreamEvent init(UUID conversationId) {
        return new ChatStreamEvent(EventType.INIT, null, null, null, conversationId, false, null);
    }

    public static ChatStreamEvent content(String delta) {
        return new ChatStreamEvent(EventType.CONTENT, delta, null, null, null, false, null);
    }

    public static ChatStreamEvent toolCall(ToolCallInfo toolCall) {
        return new ChatStreamEvent(EventType.TOOL_CALL, null, toolCall, null, null, false, null);
    }

    public static ChatStreamEvent complete(UUID conversationId, List<String> sources, boolean confirmationRequired, UUID pendingComplaintId) {
        return new ChatStreamEvent(EventType.COMPLETE, null, null, sources, conversationId, confirmationRequired, pendingComplaintId);
    }

    public static ChatStreamEvent error(String errorMessage) {
        return new ChatStreamEvent(EventType.ERROR, errorMessage, null, null, null, false, null);
    }
}
