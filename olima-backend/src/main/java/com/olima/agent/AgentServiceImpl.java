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
    private final MessageRepository messageRepository;
    private final ObjectMapper objectMapper;

    @Override
    public ChatResponse chat(ChatRequest request) {
        OrganizationResponse org = organizationService.findById(request.organizationId());

        UUID convId = request.conversationId();
        if (convId == null) {
            ConversationResponse conv = conversationService.createConversation(org.id(), "Chat with " + org.name());
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
                        String subject = (String) params.getOrDefault("subject", "Complaint");
                        String description = (String) params.getOrDefault("description", "");
                        String category = (String) params.getOrDefault("category", "OTHER");

                        ComplaintEntity draft = complaintService.createDraft(
                                org.id(), finalConvId, subject, description, category);
                        pendingComplaintId[0] = draft.getId();
                        confirmationRequired[0] = true;

                        long duration = System.currentTimeMillis() - startTime;
                        toolCalls.add(new ToolCallInfo(tool.getName(),
                                objectMapper.writeValueAsString(params),
                                "Draft created, waiting for user confirmation",
                                ExecutionStatus.WAITING_CONFIRMATION, duration));

                        return "{\"status\": \"WAITING_CONFIRMATION\", \"complaintId\": \""
                                + draft.getId() + "\", \"message\": \"Complaint draft created successfully. "
                                + "Subject: " + subject + ". Please ask the user to confirm before submission.\"}";
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

        callbacks.add(createWebSearchCallback(org.name(), allSources, toolCalls, null));

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
                                String subject = (String) params.getOrDefault("subject", "Complaint");
                                String description = (String) params.getOrDefault("description", "");
                                String category = (String) params.getOrDefault("category", "OTHER");

                                ComplaintEntity draft = complaintService.createDraft(
                                        org.id(), finalConvId, subject, description, category);
                                pendingComplaintId[0] = draft.getId();
                                confirmationRequired[0] = true;

                                long duration = System.currentTimeMillis() - startTime;
                                ToolCallInfo info = new ToolCallInfo(tool.getName(),
                                        objectMapper.writeValueAsString(params),
                                        "Draft created, waiting for user confirmation",
                                        ExecutionStatus.WAITING_CONFIRMATION, duration);
                                sendSseEvent(emitter, ChatStreamEvent.toolCall(info));

                                return "{\"status\": \"WAITING_CONFIRMATION\", \"complaintId\": \""
                                        + draft.getId() + "\", \"message\": \"Complaint draft created successfully. "
                                        + "Subject: " + subject + ". Please ask the user to confirm before submission.\"}";
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

                callbacks.add(createWebSearchCallback(org.name(), allSources, null, emitter));

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
        String message = "Your complaint has been confirmed and submitted successfully. "
                + "You will receive a response within 15 working days.";
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
                + "6. MULTI-ORGANIZATION PLATFORM ROUTING:\n"
                + "   - If the user asks about an entirely different government sphere (for example, Transport, Healthcare, or Taxation), explain politely: 'Men ayni paytda " + org.name() + " bo\\'yicha maslahatchiman. Bizning platformamizda ushbu soha tashkiloti ham alohida integratsiya qilingan bo\\'lib, yuqoridagi menyudan uni tanlab, tegishli savollaringizga to\\'liq javob olishingiz mumkin.'\n\n"
                + "7. TONE & COMMUNICATION:\n"
                + "   - Be friendly, respectful, and authoritative.\n"
                + "   - Communicate fluently in the language of the user (Uzbek, Russian, or English).";
    }
}
