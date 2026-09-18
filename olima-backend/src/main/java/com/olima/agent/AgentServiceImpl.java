package com.olima.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.olima.agent.dto.ChatRequest;
import com.olima.agent.dto.ChatResponse;
import com.olima.agent.dto.ChatStreamEvent;
import com.olima.agent.dto.ToolCallInfo;
import com.olima.complaint.ComplaintEntity;
import com.olima.complaint.ComplaintService;
import com.olima.conversation.ConversationService;
import com.olima.conversation.MessageEntity;
import com.olima.conversation.MessageRepository;
import com.olima.conversation.MessageRole;
import com.olima.conversation.dto.ConversationResponse;
import com.olima.execution.ExecutionStatus;
import com.olima.execution.ToolExecutionService;
import com.olima.execution.ToolExecutorRegistry;
import com.olima.execution.ToolResult;
import com.olima.execution.WebSearchService;
import com.olima.knowledge.DocumentChunkEntity;
import com.olima.knowledge.KnowledgeService;
import com.olima.organization.OrganizationService;
import com.olima.organization.dto.OrganizationResponse;
import com.olima.security.AuthenticatedUser;
import com.olima.tool.ToolEntity;
import com.olima.tool.registry.DynamicToolCallbackFactory;
import com.olima.tool.registry.ToolRegistry;
import com.olima.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Function;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentServiceImpl implements AgentService {

    private final ChatClient.Builder chatClientBuilder;
    private final ToolRegistry toolRegistry;
    private final ToolExecutorRegistry toolExecutorRegistry;
    private final DynamicToolCallbackFactory dynamicToolCallbackFactory;
    private final ConversationService conversationService;
    private final ToolExecutionService toolExecutionService;
    private final ComplaintService complaintService;
    private final OrganizationService organizationService;
    private final WebSearchService webSearchService;
    private final KnowledgeService knowledgeService;
    private final MessageRepository messageRepository;
    private final ObjectMapper objectMapper;

    @Override
    public ChatResponse chat(ChatRequest request) {
        assertOrganizationAccess(currentPrincipal(), request.organizationId());
        OrganizationResponse org = organizationService.findById(request.organizationId());

        UUID convId = request.conversationId();
        if (convId == null) {
            ConversationResponse conv = conversationService.createConversation(org.id(), "Suhbat: " + org.name());
            convId = conv.id();
        }

        List<ToolEntity> enabledTools = toolRegistry.getEnabledTools(org.id());
        List<ToolCallback> callbacks = new ArrayList<>();
        List<ToolCallInfo> toolCalls = new ArrayList<>();
        List<String> allSources = new ArrayList<>();

        final UUID finalConvId = convId;
        final UUID[] pendingComplaintId = {null};
        final boolean[] confirmationRequired = {false};

        for (ToolEntity tool : enabledTools) {
            ToolCallback callback = dynamicToolCallbackFactory.createCallback(tool, params -> {
                long startTime = System.currentTimeMillis();
                try {
                    if (tool.isRequiresConfirmation()) {
                        String subject = (String) params.getOrDefault("subject", "Shikoyat");
                        String description = (String) params.getOrDefault("description", "");
                        String category = (String) params.getOrDefault("category", "OTHER");

                        ComplaintEntity draft = complaintService.createDraft(
                                org.id(), finalConvId, subject, description, category);
                        pendingComplaintId[0] = draft.getId();
                        confirmationRequired[0] = true;

                        long duration = System.currentTimeMillis() - startTime;
                        toolCalls.add(new ToolCallInfo(tool.getName(),
                                objectMapper.writeValueAsString(params),
                                "Qoralama yaratildi, tasdiqlash kutilmoqda",
                                ExecutionStatus.WAITING_CONFIRMATION, duration));

                        return "{\"status\": \"WAITING_CONFIRMATION\", \"complaintId\": \""
                                + draft.getId() + "\", \"message\": \"Murojaat qoralamasi muvaffaqiyatli yaratildi. "
                                + "Mavzu: " + subject + ". Iltimos, yuborishdan oldin foydalanuvchidan tasdiqlashini so'rang.\"}";
                    }

                    ToolResult result = toolExecutorRegistry.execute(tool, params);
                    long duration = System.currentTimeMillis() - startTime;

                    toolExecutionService.record(org.id(), finalConvId, tool.getId(),
                            tool.getName(), params, result, duration);

                    if (result.sources() != null) {
                        allSources.addAll(result.sources());
                    }

                    String resultJson = serializeToolResult(result);
                    toolCalls.add(new ToolCallInfo(tool.getName(),
                            objectMapper.writeValueAsString(params), resultJson,
                            result.success() ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED, duration));

                    return resultJson;
                } catch (Exception e) {
                    long duration = System.currentTimeMillis() - startTime;
                    log.error("Tool execution failed for {}: {}", tool.getName(), e.getMessage(), e);
                    toolCalls.add(new ToolCallInfo(tool.getName(),
                            params.toString(), e.getMessage(), ExecutionStatus.FAILED, duration));
                    return "{\"error\": \"" + e.getMessage() + "\"}";
                }
            });
            callbacks.add(callback);
        }

        callbacks.add(createKnowledgeSearchCallback(org.id(), org.name(), allSources, toolCalls, null));
        callbacks.add(createWebSearchCallback(org.name(), allSources, toolCalls, null));
        callbacks.add(createFetchWebPageCallback(allSources, toolCalls, null));

        List<Message> historyMessages = buildHistoryMessages(convId);
        String systemPrompt = buildSystemPrompt(org);
        conversationService.addMessage(convId, MessageRole.USER, request.message(), null, null);

        ChatClient chatClient = chatClientBuilder.build();
        String response = chatClient.prompt()
                .system(systemPrompt)
                .messages(historyMessages)
                .user(request.message())
                .toolCallbacks(callbacks)
                .call()
                .content();

        conversationService.addMessage(convId, MessageRole.ASSISTANT, response, null, null);

        return new ChatResponse(convId, response, toolCalls, allSources,
                confirmationRequired[0], pendingComplaintId[0]);
    }

    @Override
    public SseEmitter chatStream(ChatRequest request) {
        SseEmitter emitter = new SseEmitter(180_000L);
        // SecurityContextHolder is thread-local and CompletableFuture.runAsync hops off this
        // request thread, so the principal must be captured here and passed in explicitly.
        AuthenticatedUser principal = currentPrincipal();

        CompletableFuture.runAsync(() -> {
            try {
                assertOrganizationAccess(principal, request.organizationId());
                OrganizationResponse org = organizationService.findById(request.organizationId());

                UUID convId = request.conversationId();
                if (convId == null) {
                    ConversationResponse conv = conversationService.createConversation(org.id(), "Chat with " + org.name());
                    convId = conv.id();
                }

                final UUID finalConvId = convId;
                sendSseEvent(emitter, ChatStreamEvent.init(finalConvId));

                List<ToolEntity> enabledTools = toolRegistry.getEnabledTools(org.id());
                List<ToolCallback> callbacks = new ArrayList<>();
                List<String> allSources = new CopyOnWriteArrayList<>();

                final UUID[] pendingComplaintId = {null};
                final boolean[] confirmationRequired = {false};

                for (ToolEntity tool : enabledTools) {
                    ToolCallback callback = dynamicToolCallbackFactory.createCallback(tool, params -> {
                        long startTime = System.currentTimeMillis();
                        try {
                            if (tool.isRequiresConfirmation()) {
                                String subject = (String) params.getOrDefault("subject", "Shikoyat");
                                String description = (String) params.getOrDefault("description", "");
                                String category = (String) params.getOrDefault("category", "OTHER");

                                ComplaintEntity draft = complaintService.createDraft(
                                        org.id(), finalConvId, subject, description, category);
                                pendingComplaintId[0] = draft.getId();
                                confirmationRequired[0] = true;

                                long duration = System.currentTimeMillis() - startTime;
                                ToolCallInfo info = new ToolCallInfo(tool.getName(),
                                        objectMapper.writeValueAsString(params),
                                        "Qoralama yaratildi, tasdiqlash kutilmoqda",
                                        ExecutionStatus.WAITING_CONFIRMATION, duration);
                                sendSseEvent(emitter, ChatStreamEvent.toolCall(info));

                                return "{\"status\": \"WAITING_CONFIRMATION\", \"complaintId\": \""
                                        + draft.getId() + "\", \"message\": \"Murojaat qoralamasi muvaffaqiyatli yaratildi. "
                                        + "Mavzu: " + subject + ". Iltimos, yuborishdan oldin foydalanuvchidan tasdiqlashini so'rang.\"}";
                            }

                            ToolResult result = toolExecutorRegistry.execute(tool, params);
                            long duration = System.currentTimeMillis() - startTime;

                            toolExecutionService.record(org.id(), finalConvId, tool.getId(),
                                    tool.getName(), params, result, duration);

                            if (result.sources() != null) {
                                allSources.addAll(result.sources());
                            }

                            String resultJson = serializeToolResult(result);
                            ToolCallInfo info = new ToolCallInfo(tool.getName(),
                                    objectMapper.writeValueAsString(params), resultJson,
                                    result.success() ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED, duration);
                            sendSseEvent(emitter, ChatStreamEvent.toolCall(info));

                            return resultJson;
                        } catch (Exception e) {
                            long duration = System.currentTimeMillis() - startTime;
                            log.error("Tool execution failed for {}: {}", tool.getName(), e.getMessage(), e);
                            ToolCallInfo errorInfo = new ToolCallInfo(tool.getName(),
                                    params.toString(), e.getMessage(), ExecutionStatus.FAILED, duration);
                            sendSseEvent(emitter, ChatStreamEvent.toolCall(errorInfo));
                            return "{\"error\": \"" + e.getMessage() + "\"}";
                        }
                    });
                    callbacks.add(callback);
                }

                callbacks.add(createKnowledgeSearchCallback(org.id(), org.name(), allSources, null, emitter));
                callbacks.add(createWebSearchCallback(org.name(), allSources, null, emitter));
                callbacks.add(createFetchWebPageCallback(allSources, null, emitter));

                List<Message> historyMessages = buildHistoryMessages(finalConvId);
                String systemPrompt = buildSystemPrompt(org);
                conversationService.addMessage(finalConvId, MessageRole.USER, request.message(), null, null);

                ChatClient chatClient = chatClientBuilder.build();
                StringBuilder fullResponse = new StringBuilder();

                chatClient.prompt()
                        .system(systemPrompt)
                        .messages(historyMessages)
                        .user(request.message())
                        .toolCallbacks(callbacks)
                        .stream()
                        .content()
                        .doOnNext(chunk -> {
                            if (chunk != null) {
                                fullResponse.append(chunk);
                                sendSseEvent(emitter, ChatStreamEvent.content(chunk));
                            }
                        })
                        .doOnError(err -> {
                            log.error("Error during chat streaming: {}", err.getMessage(), err);
                            sendSseEvent(emitter, ChatStreamEvent.error(err.getMessage()));
                            try {
                                emitter.complete();
                            } catch (Exception ignored) {}
                        })
                        .doOnComplete(() -> {
                            try {
                                String responseText = fullResponse.toString();
                                if (!responseText.isBlank()) {
                                    conversationService.addMessage(finalConvId, MessageRole.ASSISTANT, responseText, null, null);
                                }
                                sendSseEvent(emitter, ChatStreamEvent.complete(finalConvId, allSources,
                                        confirmationRequired[0], pendingComplaintId[0]));
                                emitter.complete();
                            } catch (Exception e) {
                                log.error("Error in onComplete: {}", e.getMessage(), e);
                                try {
                                    emitter.complete();
                                } catch (Exception ignored) {}
                            }
                        })
                        .blockLast();

            } catch (Exception e) {
                log.error("Failed to initialize chat stream: {}", e.getMessage(), e);
                sendSseEvent(emitter, ChatStreamEvent.error(e.getMessage()));
                try {
                    emitter.complete();
                } catch (Exception ignored) {}
            }
        });

        return emitter;
    }

    private ToolCallback createKnowledgeSearchCallback(UUID orgId, String orgName, List<String> allSources, List<ToolCallInfo> toolCalls, SseEmitter sseEmitter) {
        String inputSchema = "{\n"
                + "  \"type\": \"object\",\n"
                + "  \"properties\": {\n"
                + "    \"query\": {\n"
                + "      \"type\": \"string\",\n"
                + "      \"description\": \"Keywords to search for in " + orgName + "'s internal knowledge base of uploaded official documents (decrees, laws, regulations, concepts, policies)\"\n"
                + "    }\n"
                + "  },\n"
                + "  \"required\": [\"query\"]\n"
                + "}";

        Function<Map<String, Object>, String> searchFunc = params -> {
            long startTime = System.currentTimeMillis();
            String query = (String) params.getOrDefault("query", "");
            log.info("Executing knowledge base search for query: {}", query);
            List<DocumentChunkEntity> chunks = knowledgeService.search(orgId, query, 5);
            long duration = System.currentTimeMillis() - startTime;

            List<String> urls = chunks.stream()
                    .map(DocumentChunkEntity::getSourceUrl)
                    .filter(u -> u != null && !u.isBlank())
                    .distinct()
                    .toList();
            allSources.addAll(urls);

            List<Map<String, Object>> payload = chunks.stream().map(c -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("content", c.getContent());
                item.put("source", c.getSourceUrl());
                return item;
            }).toList();

            try {
                String resultJson = payload.isEmpty()
                        ? "{\"results\": [], \"message\": \"Ushbu so'rov bo'yicha ichki bilimlar bazasidan tegishli hujjatlar topilmadi.\"}"
                        : objectMapper.writeValueAsString(Map.of("results", payload));
                ToolCallInfo info = new ToolCallInfo("search_knowledge_base",
                        objectMapper.writeValueAsString(params), resultJson,
                        ExecutionStatus.SUCCESS, duration);
                if (toolCalls != null) {
                    toolCalls.add(info);
                }
                if (sseEmitter != null) {
                    sendSseEvent(sseEmitter, ChatStreamEvent.toolCall(info));
                }
                return resultJson;
            } catch (Exception e) {
                return "{\"error\": \"" + e.getMessage() + "\"}";
            }
        };

        return FunctionToolCallback.builder("search_knowledge_base", searchFunc)
                .description("Search " + orgName + "'s own internal knowledge base (uploaded documents, decrees, laws, regulations, concepts, PDFs, policies, institution/program lists, and any other material staff uploaded). "
                        + "Try this FIRST for ANY question within " + orgName + "'s domain — including document lookups, comparisons, recommendations, or lists of institutions/programs — before using search_internet.")
                .inputType(Map.class)
                .inputSchema(inputSchema)
                .build();
    }

    private ToolCallback createWebSearchCallback(String orgName, List<String> allSources, List<ToolCallInfo> toolCalls, SseEmitter sseEmitter) {
        String inputSchema = "{\n"
                + "  \"type\": \"object\",\n"
                + "  \"properties\": {\n"
                + "    \"query\": {\n"
                + "      \"type\": \"string\",\n"
                + "      \"description\": \"The search query to look up on the public internet for public information strictly related to " + orgName + "\"\n"
                + "    }\n"
                + "  },\n"
                + "  \"required\": [\"query\"]\n"
                + "}";

        Function<Map<String, Object>, String> searchFunc = params -> {
            long startTime = System.currentTimeMillis();
            String query = (String) params.getOrDefault("query", "");
            log.info("Executing web search for query: {}", query);
            List<WebSearchService.SearchResult> results = webSearchService.search(query);
            long duration = System.currentTimeMillis() - startTime;

            List<String> urls = results.stream().map(WebSearchService.SearchResult::url).filter(u -> u != null && !u.isBlank()).toList();
            allSources.addAll(urls);

            try {
                String resultJson = objectMapper.writeValueAsString(results);
                ToolCallInfo info = new ToolCallInfo("search_internet",
                        objectMapper.writeValueAsString(params), resultJson,
                        ExecutionStatus.SUCCESS, duration);
                if (toolCalls != null) {
                    toolCalls.add(info);
                }
                if (sseEmitter != null) {
                    sendSseEvent(sseEmitter, ChatStreamEvent.toolCall(info));
                }
                return resultJson;
            } catch (Exception e) {
                return "{\"error\": \"" + e.getMessage() + "\"}";
            }
        };

        return FunctionToolCallback.builder("search_internet", searchFunc)
                .description("Search the public internet for ANY public information STRICTLY related to " + orgName + "'s domain when internal tools and the knowledge base do not have the answer — official regulations, decrees, news, statistics, institution/program listings, comparisons, or recommendations based on the retrieved facts. NEVER use this tool for topics outside " + orgName + " (e.g. general programming, entertainment, sports, cooking, jokes), and NEVER use for private student/citizen data.")
                .inputType(Map.class)
                .inputSchema(inputSchema)
                .build();
    }

    private ToolCallback createFetchWebPageCallback(List<String> allSources, List<ToolCallInfo> toolCalls, SseEmitter sseEmitter) {
        String inputSchema = "{\n"
                + "  \"type\": \"object\",\n"
                + "  \"properties\": {\n"
                + "    \"url\": {\n"
                + "      \"type\": \"string\",\n"
                + "      \"description\": \"The absolute HTTP/HTTPS URL of the webpage to fetch and read\"\n"
                + "    }\n"
                + "  },\n"
                + "  \"required\": [\"url\"]\n"
                + "}";

        Function<Map<String, Object>, String> fetchFunc = params -> {
            long startTime = System.currentTimeMillis();
            String url = (String) params.getOrDefault("url", "");
            log.info("Executing fetch_web_page for url: {}", url);
            String content = webSearchService.fetchPage(url);
            long duration = System.currentTimeMillis() - startTime;

            if (url != null && !url.isBlank() && !allSources.contains(url)) {
                allSources.add(url);
            }

            try {
                String snippet = content.length() > 300 ? content.substring(0, 300) + "..." : content;
                ToolCallInfo info = new ToolCallInfo("fetch_web_page",
                        objectMapper.writeValueAsString(params), snippet,
                        ExecutionStatus.SUCCESS, duration);
                if (toolCalls != null) {
                    toolCalls.add(info);
                }
                if (sseEmitter != null) {
                    sendSseEvent(sseEmitter, ChatStreamEvent.toolCall(info));
                }
                return content;
            } catch (Exception e) {
                return content;
            }
        };

        return FunctionToolCallback.builder("fetch_web_page", fetchFunc)
                .description("Fetch and read the full text and tables of a webpage URL found in search results when the search snippet is truncated, incomplete, or lacks detailed tables (e.g. abt.uz or infoedu.uz).")
                .inputType(Map.class)
                .inputSchema(inputSchema)
                .build();
    }

    private AuthenticatedUser currentPrincipal() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AuthenticatedUser user ? user : null;
    }

    private void assertOrganizationAccess(AuthenticatedUser principal, UUID organizationId) {
        if (principal != null && principal.role() == UserRole.ORG_ADMIN && !organizationId.equals(principal.organizationId())) {
            throw new AccessDeniedException("You do not have access to this organization's data");
        }
    }

    /**
     * On failure, ToolResult.data() is null — serializing it alone would hand the model
     * the literal string "null" with no explanation, so it can't reason about a fallback.
     */
    private String serializeToolResult(ToolResult result) {
        try {
            if (result.success()) {
                return objectMapper.writeValueAsString(result.data());
            }
            String error = (result.error() != null && !result.error().isBlank())
                    ? result.error()
                    : "Tool returned no data";
            return objectMapper.writeValueAsString(Map.of("success", false, "error", error));
        } catch (Exception e) {
            return "{\"success\": false, \"error\": \"Failed to serialize tool result\"}";
        }
    }

    private void sendSseEvent(SseEmitter emitter, ChatStreamEvent event) {
        try {
            emitter.send(SseEmitter.event()
                    .data(objectMapper.writeValueAsString(event)));
        } catch (Exception e) {
            log.warn("Failed to send SSE event: {}", e.getMessage());
        }
    }

    @Override
    public ChatResponse confirmAction(UUID conversationId, UUID complaintId) {
        complaintService.confirm(complaintId);
        String message = "Murojaatingiz muvaffaqiyatli tasdiqlandi va yuborildi. "
                + "Sizga 15 ish kuni ichida javob beriladi.";
        conversationService.addMessage(conversationId, MessageRole.ASSISTANT, message, null, null);
        return new ChatResponse(conversationId, message, List.of(), List.of(), false, null);
    }

    private List<Message> buildHistoryMessages(UUID conversationId) {
        List<Message> result = new ArrayList<>();
        if (conversationId == null) {
            return result;
        }
        List<MessageEntity> history = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        int start = Math.max(0, history.size() - 20);
        for (int i = start; i < history.size(); i++) {
            MessageEntity m = history.get(i);
            if (m.getContent() != null && !m.getContent().isBlank()) {
                if (m.getRole() == MessageRole.USER) {
                    result.add(new UserMessage(m.getContent()));
                } else if (m.getRole() == MessageRole.ASSISTANT) {
                    result.add(new AssistantMessage(m.getContent()));
                }
            }
        }
        return result;
    }

    private String buildSystemPrompt(OrganizationResponse org) {
        String about = (org.description() != null && !org.description().isBlank())
                ? org.description()
                : "No further description was provided by the organization.";

        return "You are OLIMA, the official AI assistant for **" + org.name() + "** ONLY, on a multi-tenant platform where each government organization has its own separate chatbot.\n"
                + "About " + org.name() + ": " + about + "\n\n"

                + "TOOL PRIORITY — always try in this order before answering or refusing. These tools cover EVERY kind of question in your domain, not just documents/regulations — including recommendations, comparisons, and lists of institutions or programs:\n"
                + "1. Specific internal tools for personal/official data (e.g. student profile, contract, scholarship, transfer rules, academic leave rules) when the question matches what they do.\n"
                + "2. 'search_knowledge_base' — " + org.name() + "'s own uploaded documents and material. Try this for anything within your domain that isn't a personal-data lookup.\n"
                + "3. 'search_internet' and 'fetch_web_page' — for any other public information about " + org.name() + "'s domain not covered above.\n"
                + "Never use 'search_internet' for private/personal data (grades, balances, individual records) — only the dedicated internal tools may return those, and only after the user provides their ID.\n"
                + "If a tool call fails, errors out, or comes back empty (you will see \"success\": false or an empty list), do NOT give up or apologize yet — move to the next tool in the priority order (e.g. an internal tool failed → try search_knowledge_base; that found nothing → try search_internet) before answering. Only tell the user you could not find the information after every relevant tool has been tried.\n"
                + "IMPORTANT: recommending, comparing, or suggesting specific institutions/programs/options based on facts you retrieved is a normal, core part of your job — it is NOT restricted personal advice. Never refuse a question just because it uses words like 'recommend' or 'suggest'; retrieve the facts with your tools and answer directly.\n\n"

                + "DOMAIN BOUNDARY — you must enforce this on every message. There are exactly two kinds of refusal, do not blend them:\n"
                + "- You yourself ARE " + org.name() + " — any question about " + org.name() + " itself, its leadership, structure, services, or the topic already being discussed is firmly IN SCOPE, never a reason to refuse. Keep using conversation context for natural follow-ups (pronouns, short clarifying questions).\n"
                + "- CASE A — the user explicitly names or unambiguously means a SPECIFIC government organization OTHER THAN " + org.name() + " (a different named ministry/agency — NOT " + org.name() + " itself, and not a generic mention of your own domain). Do NOT answer or search. Reply briefly in the user's language, name that other organization, and tell them to switch to it from the organization menu at the top of the page.\n"
                + "- CASE B — anything with no connection to any government organization at all: general topics, commodity/product prices, weather, sports, entertainment, programming help. Just briefly state in the user's language that you only help with " + org.name() + " matters. Do NOT mention another organization, do NOT tell them to contact anyone else — there is no specific organization to point to.\n"
                + "- Both refusals must be one short sentence, no disclaimers, no repeating the question back.\n"
                + "- If the question IS about " + org.name() + " but none of your tools returned anything useful (no documents uploaded yet, nothing found online), do NOT use either refusal above — that would wrongly imply the topic is out of scope. Instead say plainly, in the user's language, that you don't have specific information on that yet, and that uploading documents to the knowledge base or asking something more specific would help.\n\n"

                + "COMPLAINTS: to file one, use 'create_complaint_draft' and tell the user it needs their explicit confirmation before submission.\n\n"

                + "RESPONSE STYLE:\n"
                + "- Be concise and direct: lead with the answer, then short bullet points if needed. No filler, no repeated disclaimers, no long intros or closings.\n"
                + "- Use a Markdown table for any list of comparable items (options, fees, schedules, statistics).\n"
                + "- For addresses or physical locations, include coordinates either as a ```map { \"lat\":..., \"lng\":..., \"title\":..., \"address\":... } ``` block or as [lat, lng] — the UI renders these as an interactive map automatically.\n"
                + "- Do not paste raw source URLs into your answer text — the UI already lists the sources used as clickable links below your reply.\n"
                + "- Reply in the same language the user is writing in (Uzbek, Russian, or English).";
    }
}
