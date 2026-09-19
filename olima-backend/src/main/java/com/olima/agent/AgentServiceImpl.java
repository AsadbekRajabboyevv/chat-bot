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
import com.olima.knowledge.DocumentEntity;
import com.olima.knowledge.DocumentRepository;
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
    private final DocumentRepository documentRepository;
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
                    boolean isSuccess = result.success() && result.data() != null
                            && !result.data().toString().trim().isBlank()
                            && !result.data().toString().trim().equals("null")
                            && !result.data().toString().trim().equals("[]");
                    toolCalls.add(new ToolCallInfo(tool.getName(),
                            objectMapper.writeValueAsString(params), resultJson,
                            isSuccess ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED, duration));

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
                            boolean isSuccess = result.success() && result.data() != null
                                    && !result.data().toString().trim().isBlank()
                                    && !result.data().toString().trim().equals("null")
                                    && !result.data().toString().trim().equals("[]");
                            ToolCallInfo info = new ToolCallInfo(tool.getName(),
                                    objectMapper.writeValueAsString(params), resultJson,
                                    isSuccess ? ExecutionStatus.SUCCESS : ExecutionStatus.FAILED, duration);
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
                    .map(c -> resolveKnowledgeSourceLabel(c, orgName))
                    .filter(u -> u != null && !u.isBlank())
                    .distinct()
                    .toList();
            allSources.addAll(urls);

            List<Map<String, Object>> payload = chunks.stream().map(c -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("content", c.getContent());
                item.put("source", resolveKnowledgeSourceLabel(c, orgName));
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
                .description("Search the public internet for ANY public information STRICTLY related to " + orgName + "'s domain when internal tools and the knowledge base do not have the answer — universities, faculties, distance education (masofaviy ta'lim), evening courses (sirtqi), entrance cutoff scores, quotas, contracts, news, statistics, institution/program listings, comparisons, or recommendations based on the retrieved facts. NEVER use this tool for topics outside " + orgName + " (e.g. general programming, entertainment, sports, cooking, jokes), and NEVER use for private student/citizen data.")
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
     * Serializes tool results into JSON. If the tool returned no data, an empty list,
     * or a failure, returns an actionable instruction JSON so the LLM knows to fall back
     * to search_internet immediately instead of giving up or apologizing.
     */
    private String serializeToolResult(ToolResult result) {
        try {
            if (result.success() && result.data() != null) {
                String str = result.data().toString().trim();
                if (!str.isBlank() && !str.equals("null") && !str.equals("[]")) {
                    return objectMapper.writeValueAsString(result.data());
                }
            }
            String error = (result.error() != null && !result.error().isBlank())
                    ? result.error()
                    : "Ichki ma'lumotlar bazasida ma'lumot topilmadi yoki bo'sh";
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("success", false);
            fallback.put("error", error);
            fallback.put("action_required", "Ichki bazadan ma'lumot topilmadi yoki bo'sh. Foydalanuvchi so'roviga to'liq va aniq javob berish uchun darhol 'search_internet' vositasi orqali internetdan qidiring!");
            return objectMapper.writeValueAsString(fallback);
        } catch (Exception e) {
            return "{\"success\": false, \"error\": \"Failed to serialize tool result\", \"action_required\": \"Use 'search_internet' to find public information on the web.\"}";
        }
    }

    private String resolveKnowledgeSourceLabel(DocumentChunkEntity chunk, String orgName) {
        String sourceUrl = chunk.getSourceUrl();
        if (sourceUrl != null && (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://"))) {
            return sourceUrl;
        }

        if (chunk.getDocumentId() != null) {
            DocumentEntity doc = documentRepository.findById(chunk.getDocumentId()).orElse(null);
            if (doc != null && doc.getTitle() != null && !doc.getTitle().isBlank()) {
                String cleanTitle = cleanDocumentTitle(doc.getTitle());
                if (!cleanTitle.isBlank()) {
                    return (orgName != null && !orgName.isBlank() ? orgName + ": " : "") + cleanTitle;
                }
            }
        }

        if (sourceUrl != null && !sourceUrl.isBlank()) {
            String clean = cleanDocumentTitle(sourceUrl);
            if (!clean.isBlank()) {
                return (orgName != null && !orgName.isBlank() ? orgName + ": " : "") + clean;
            }
        }

        return (orgName != null && !orgName.isBlank()) ? orgName + " rasmiy hujjati" : "Rasmiy hujjat";
    }

    private String cleanDocumentTitle(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String title = raw.replaceAll("(?i)\\.[a-z0-9]{2,5}$", "");
        title = title.replaceAll("^\\d{8,}[_\\-\\s]*", "");
        title = title.replace('_', ' ').replace('-', ' ').trim();
        String lower = title.toLowerCase();
        if (lower.isBlank() || lower.equals("document") || lower.equals("doc")
                || lower.equals("file") || lower.equals("fayl") || lower.equals("hujjat") || lower.equals("data")) {
            return "";
        }
        return title.substring(0, 1).toUpperCase() + title.substring(1);
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
                + "1. Specific internal tools for personal/official data (e.g. student profile, contract, scholarship, search_universities, transfer rules, academic leave rules) when the question matches what they do.\n"
                + "2. 'search_knowledge_base' — " + org.name() + "'s own uploaded documents and material. Try this for anything within your domain that isn't a personal-data lookup.\n"
                + "3. 'search_internet' and 'fetch_web_page' — for any other public information about " + org.name() + "'s domain not covered above (universities, faculties, distance education, admission scores, contract costs, statistics, news).\n"
                + "Never use 'search_internet' for private/personal data (grades, balances, individual records) — only the dedicated internal tools may return those, and only after the user provides their ID.\n\n"

                + "CRITICAL FALLBACK TO WEB SEARCH (MANDATORY):\n"
                + "- If an internal tool (e.g. 'search_universities', 'get_transfer_rules', 'get_academic_leave_rules', or 'search_knowledge_base') returns null, empty list [], failure, or does NOT contain the specific details requested by the user (such as distance education / masofaviy ta'lim, evening courses / sirtqi, IT programs, admission cutoff scores, contract fees, specific universities or faculties):\n"
                + "  YOU MUST NEVER APOLOGIZE OR SAY 'universitetlar ro'yxatini olishda muammo yuzaga keldi' OR 'ma'lumot topilmadi' OR 'vazirlik saytiga kiring'!\n"
                + "  Instead, you MUST AUTOMATICALLY AND IMMEDIATELY CALL 'search_internet' (e.g. query 'O‘zbekistonda IT masofaviy taʼlim universitetlar' or similar) and 'fetch_web_page' to retrieve live information from the web!\n"
                + "  Then provide a comprehensive, well-structured answer with real universities (e.g. TATU, Toshkent Amaliy Fanlar Universiteti, IT Park University, etc.), detailing programs and requirements formatted in a Markdown table.\n"
                + "  IMPORTANT: recommending, comparing, or suggesting specific institutions/programs/options based on facts you retrieved is a normal, core part of your job — it is NOT restricted personal advice. Never refuse a question just because it uses words like 'recommend' or 'suggest'; retrieve the facts with your tools and answer directly.\n\n"

                + "ENTRANCE EXAM SCORES (KIRISH BALLARI):\n"
                + "- In Uzbekistan Higher Education (DTM / Bilimni baholash agentligi), the MAXIMUM possible entrance score is STRICTLY 189.0 points (never tens of thousands). 56.7 (kontrakt) and 68.0 (grant) are only general minimum threshold barriers across the republic, NOT the actual cutoff scores for competitive faculties (e.g. Dasturiy injiniring, Kiberxavfsizlik have much higher cutoffs). Always format university score tables using Markdown: | Ta'lim yo'nalishi | Davlat granti | To'lov-kontrakt |.\n\n"

                + "DOMAIN BOUNDARY — you must enforce this on every message. There are exactly three outcomes for any message; pick exactly one, never blend their wording:\n"
                + "- You yourself ARE " + org.name() + " — any question about " + org.name() + " itself, its leadership, structure, services, history, or the topic already being discussed is firmly IN SCOPE. A broad request like 'tell me about " + org.name() + "' is IN SCOPE too: call 'search_knowledge_base' with the organization's name as the query, and if that returns nothing, call 'search_internet' the same way, before you say anything else.\n"
                + "- OUTCOME A (wrong organization) — ONLY when the user explicitly names or unambiguously means a SPECIFIC government organization OTHER THAN " + org.name() + " (a different named ministry/agency — never " + org.name() + " itself). Reply with exactly one short sentence in the user's language: name that other organization and say they should switch to it from the organization menu at the top of the page.\n"
                + "- OUTCOME B (unrelated to government) — the message has no connection to any government organization at all: general topics, commodity/product prices, weather, sports, entertainment, programming help. Reply with exactly one short sentence in the user's language stating you only help with " + org.name() + " matters. Never use this outcome, and never say 'I only help with " + org.name() + " matters', for a question that IS about " + org.name() + " — that phrase is reserved for OUTCOME B alone.\n"
                + "- OUTCOME C (in scope, but nothing found) — the question is about " + org.name() + ", you called the relevant tools above (including search_internet), and they genuinely returned nothing useful. Say plainly, in the user's language, that you don't have specific information on that particular point yet, and suggest uploading a document to the knowledge base or asking something more specific. Do NOT phrase this as 'I only help with X matters' — that would falsely tell the user their question was off-topic when it was not.\n"
                + "- Refusals (A and B) are exactly one short sentence, no disclaimers. OUTCOME C may be one short sentence too, but must sound like 'I don't know this yet', never like 'this isn't my job'.\n\n"

                + "COMPLAINTS: to file one, use 'create_complaint_draft' and tell the user it needs their explicit confirmation before submission.\n\n"

                + "RESPONSE STYLE:\n"
                + "- Be concise and direct: lead with the answer, then short bullet points if needed. No filler, no repeated disclaimers, no long intros or closings.\n"
                + "- Use a Markdown table for any list of comparable items (options, fees, schedules, statistics).\n"
                + "- For addresses or physical locations, include coordinates either as a ```map { \"lat\":..., \"lng\":..., \"title\":..., \"address\":... } ``` block or as [lat, lng] — the UI renders these as an interactive map automatically.\n"
                + "- Do not paste raw source URLs into your answer text — the UI already lists the sources used as clickable links below your reply.\n"
                + "- Reply in the same language the user is writing in (Uzbek, Russian, or English).";
    }
}
