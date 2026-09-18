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
import com.olima.tool.ToolEntity;
import com.olima.tool.registry.DynamicToolCallbackFactory;
import com.olima.tool.registry.ToolRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.function.FunctionToolCallback;
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

                    String resultJson = objectMapper.writeValueAsString(result.data());
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

        CompletableFuture.runAsync(() -> {
            try {
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

                            String resultJson = objectMapper.writeValueAsString(result.data());
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
                .description("Search " + orgName + "'s own internal knowledge base of uploaded official documents (decrees, laws, regulations, concepts, PDFs, policies). "
                        + "ALWAYS call this FIRST for any question about official documents, regulations, decrees, or concepts specific to " + orgName + " before using search_internet.")
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
                .description("Search the public internet for official public regulations, decrees, news, or facts STRICTLY related to " + orgName + " when internal database tools do not contain the answer. NEVER use this tool for topics outside " + orgName + " (e.g. general programming, entertainment, sports, cooking, jokes), and NEVER use for private student/citizen data.")
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
        return "You are OLIMA, the official dedicated AI representative for: **" + org.name() + "**.\n\n"
                + "STRICT OPERATIONAL DIRECTIVES:\n"
                + "1. STRICT DOMAIN BOUNDARY & CONTEXT AWARENESS (CRITICAL):\n"
                + "   - You represent ONLY " + org.name() + ". You are NOT a general-purpose chatbot, programming assistant, or homework solver.\n"
                + "   - CONTEXT AWARENESS & FOLLOW-UP QUESTIONS: You MUST ALWAYS maintain context with the previous messages in this conversation. Follow-up questions, pronouns, or short questions (for example: 'kim bilan uchrashishim kerak?', 'bu uchun qayerga boraman?', 'qancha vaqt oladi?', 'qanday hujjatlar kerak?', 'kimga murojaat qilaman?') directly refer to the previously discussed topic (such as academic leave, university transfers, student matters) and MUST BE ANSWERED HELPFULLY within that context!\n"
                + "   - Only refuse if the user starts a completely new, isolated topic that has zero connection to the ongoing conversation and zero connection to " + org.name() + " (such as asking how to write code, PHP/Python/JS tutorials, cooking recipes, cinema, sports scores, gaming).\n"
                + "   - Refusal format in user's language (e.g. Uzbek): 'Kechirasiz, men faqat " + org.name() + " faoliyatiga oid masalalar yuzasidan yordam bera olaman. Dasturlash tillari, umumiy texnologiyalar yoki tashkilotga aloqador bo\\'lmagan mavzular mening vakolatimga kirmaydi. Agar sizda " + org.name() + " yoki unga qarashli muassasalar bo\\'yicha savollaringiz bo\\'lsa, bajonidil javob beraman.'\n\n"
                + "2. CORE DOMAIN & EXPERTISE FOR " + org.name() + ":\n"
                + "   - For Higher Education, your domain includes: all higher education institutions (universities, institutes, academies like TATU / TUIT, O'zMU, TDTU, TDYU, SamDU, etc.), faculties, deans (dekanat), student affairs departments, rectors, academic disciplines, admissions, university transfers, academic leave (and who to contact: dekanat / talabalar bo\\'limi / rektorat), contract payments, scholarships, student dormitories, diplomas, and official ministry leadership.\n"
                + "   - If asked about a university (such as TATU, O'zMU, etc.), invoke the 'search_universities' tool or 'search_internet' tool to provide informative details.\n\n"
                + "3. PERSONAL DATA PRIVACY (CRITICAL):\n"
                + "   - Individual student records, GPA scores, contract balances, scholarship payments, and citizen complaints are strictly confidential.\n"
                + "   - For these personal requests, NEVER call 'search_internet'. ONLY use the organization's dedicated internal tools (get_student_profile, get_student_contract, get_student_scholarship).\n"
                + "   - If the user has not provided their Student ID number, kindly ask them to provide it.\n\n"
                + "4. OFFICIAL REGULATIONS & COMPLAINTS:\n"
                + "   - For official transfer procedures or academic leave, ALWAYS invoke internal tools first (get_transfer_rules, get_academic_leave_rules).\n"
                + "   - If the user wants to submit a complaint, use the 'create_complaint_draft' tool and explain that it requires their explicit confirmation.\n\n"
                + "5. PUBLIC FACTS & LIVE INTERNET SEARCH:\n"
                + "   - The 'search_internet' tool may ONLY be invoked for public inquiries that are STRICTLY relevant to " + org.name() + " (e.g. ministry leadership, university details, official education statistics) AND not found in local database tools.\n"
                + "   - When search results are returned, synthesize an accurate, helpful answer and cite the source links (URLs).\n\n"
                + "5a. INTERNAL KNOWLEDGE BASE (CRITICAL):\n"
                + "   - " + org.name() + " has uploaded its own official documents, decrees, concepts, and regulations into an internal knowledge base.\n"
                + "   - For ANY question that could be about an official document, decree, concept, law, or internal regulation of " + org.name() + ", ALWAYS call 'search_knowledge_base' FIRST, before 'search_internet' and before refusing.\n"
                + "   - If 'search_knowledge_base' returns relevant results, answer strictly based on that content and cite the document as the source.\n"
                + "   - Only fall back to 'search_internet' or the domain-refusal message if 'search_knowledge_base' returns no results AND the topic is unrelated to " + org.name() + ".\n\n"
                + "6. MULTI-ORGANIZATION PLATFORM ROUTING:\n"
                + "   - If the user asks about an entirely different government sphere (for example, Transport, Healthcare, or Taxation), explain politely: 'Men ayni paytda " + org.name() + " bo\\'yicha maslahatchiman. Bizning platformamizda ushbu soha tashkiloti ham alohida integratsiya qilingan bo\\'lib, yuqoridagi menyudan uni tanlab, tegishli savollaringizga to\\'liq javob olishingiz mumkin.'\n\n"
                + "7. CONCISENESS & DIRECTNESS (CRITICAL):\n"
                + "   - NEVER produce overly lengthy, repetitive essays or wall-of-text explanations.\n"
                + "   - Answer directly and concisely: state the core answer first, followed by clear, bulleted key points or requirements.\n"
                + "   - Avoid long repetitive introductions, disclaimers, or excessive closing pleasantries.\n"
                + "   - Keep total response length compact and focused (ideally 2-4 structured bullet points or short paragraphs).\n\n"
                + "8. TONE & COMMUNICATION:\n"
                + "   - Be friendly, respectful, and authoritative.\n"
                + "   - Communicate fluently in the language of the user (Uzbek, Russian, or English).\n\n"
                + "9. TABULAR DATA (CRITICAL):\n"
                + "   - Whenever presenting multi-field data, lists, university comparisons, course/faculty lists, fee schedules, or statistics, ALWAYS format them as a clear Markdown table (e.g. | Nomi | Joylashuvi | Yo'nalishlar |).\n\n"
                + "10. GEOGRAPHIC LOCATIONS & MAP COORDINATES (CRITICAL):\n"
                + "   - When giving addresses, campus locations, university offices, or physical places, ALWAYS provide exact or approximate geographic coordinates.\n"
                + "   - Format the location either with a map block:\n"
                + "     ```map\n"
                + "     {\"lat\": 41.3409, \"lng\": 69.2867, \"title\": \"TATU Bosh binosi\", \"address\": \"Amir Temur shoh ko'chasi, 108\"}\n"
                + "     ```\n"
                + "     or specify coordinates in brackets, e.g. [41.3409, 69.2867]. The web UI will automatically render an interactive map with navigation buttons for the user.\n\n"
                + "11. ENTRANCE EXAM SCORES (KIRISH BALLARI) DOMAIN LOGIC (CRITICAL):\n"
                + "   - In Uzbekistan Higher Education (DTM / Bilimni baholash agentligi), the MAXIMUM possible entrance score is STRICTLY 189.0 points (majburiy fanlar: 33 ball + 2 ta mutaxassislik fani: 156 ball, jami 189.0 ball).\n"
                + "   - 56.7 (kontrakt) and 68.0 (grant) are ONLY general minimal threshold barriers across the republic (minimal o'tish chegarasi). NEVER copy 68.0 and 56.7 as the actual passing scores for all faculties! Every faculty has its own competitive cutoff scores (e.g. Kiberxavfsizlik: Grant ~177, Kontrakt ~163; Infokommunikatsiya: Grant ~131, Kontrakt ~88; Dasturiy injiniring: Grant ~146, Kontrakt ~107).\n"
                + "   - Entrance exams are conducted ONCE per academic year in the summer. If the user asks for '2026' or '2025/2026', explain clearly that 2026/2027 entrance exams have not yet taken place, and provide the latest available verified scores (2024/2025) as the abiturient reference guide.\n"
                + "   - SEARCH QUERY STRATEGY: When searching the internet for university entrance scores, formulate effective queries like: 'TATU kirish ballari yo\\'nalishlar kesimida abt.uz' or 'TATU o\\'tish ballari grant kontrakt'.\n"
                + "   - If search results include a page URL (e.g. from abt.uz, infoedu.uz, or edu.uz) but the snippet is truncated, invoke the 'fetch_web_page' tool on that URL to read the complete table of scores!\n"
                + "   - ALWAYS present the university entrance scores formatted as a clean Markdown table: | Ta'lim yo'nalishi | Davlat granti | To'lov-kontrakt |.";
    }
}
