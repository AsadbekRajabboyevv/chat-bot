package com.olima.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.olima.agent.AgentService;
import com.olima.agent.dto.ChatRequest;
import com.olima.agent.dto.ChatResponse;
import com.olima.organization.OrganizationRepository;
import com.olima.organization.exception.OrganizationNotFoundException;
import com.olima.telegram.dto.TelegramBotConfigRequest;
import com.olima.telegram.dto.TelegramBotConfigResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramService {
    private static final Pattern TOKEN_PATTERN = Pattern.compile("^\\d+:[A-Za-z0-9_-]{30,}$");

    private final TelegramBotConfigRepository botConfigRepository;
    private final TelegramConversationRepository telegramConversationRepository;
    private final OrganizationRepository organizationRepository;
    private final TelegramClient telegramClient;
    private final TelegramFormatter telegramFormatter;
    private final AgentService agentService;

    @Value("${app.public-base-url}")
    private String publicBaseUrl;

    @Transactional
    public TelegramBotConfigResponse configureBot(UUID organizationId, TelegramBotConfigRequest request) {
        if (!organizationRepository.existsById(organizationId)) {
            throw new OrganizationNotFoundException("Organization not found: " + organizationId);
        }

        String botToken = request.botToken().trim();
        if (!TOKEN_PATTERN.matcher(botToken).matches()) {
            throw new IllegalArgumentException("That doesn't look like a valid Telegram bot token");
        }

        String botUsername = telegramClient.getBotUsername(botToken);

        TelegramBotConfigEntity config = botConfigRepository.findByOrganizationId(organizationId)
                .orElseGet(() -> TelegramBotConfigEntity.builder()
                        .organizationId(organizationId)
                        .webhookSecret(generateSecret())
                        .build());

        config.setBotToken(botToken);
        config.setBotUsername(botUsername);
        config.setEnabled(true);
        config = botConfigRepository.save(config);

        String webhookUrl = buildWebhookUrl(config.getWebhookSecret());
        telegramClient.setWebhook(botToken, webhookUrl, config.getWebhookSecret());

        log.info("Registered Telegram bot @{} for organization {}", botUsername, organizationId);
        return toResponse(config, webhookUrl);
    }

    public TelegramBotConfigResponse getConfig(UUID organizationId) {
        TelegramBotConfigEntity config = botConfigRepository.findByOrganizationId(organizationId)
                .orElse(null);
        if (config == null) {
            return null;
        }
        return toResponse(config, buildWebhookUrl(config.getWebhookSecret()));
    }

    @Transactional
    public void disconnectBot(UUID organizationId) {
        TelegramBotConfigEntity config = botConfigRepository.findByOrganizationId(organizationId).orElse(null);
        if (config == null) {
            return;
        }
        try {
            telegramClient.deleteWebhook(config.getBotToken());
        } catch (Exception e) {
            log.warn("Failed to delete Telegram webhook for organization {}: {}", organizationId, e.getMessage());
        }
        botConfigRepository.delete(config);
    }

    /**
     * Called from the public webhook endpoint. Runs on its own thread with no HTTP security
     * context — the organization is resolved entirely from the webhook secret in the URL, so
     * there is nothing here for a caller to spoof by sending a different id.
     */
    public void handleIncomingUpdate(String webhookSecret, JsonNode update) {
        Optional<TelegramBotConfigEntity> maybeConfig = botConfigRepository.findByWebhookSecret(webhookSecret);
        if (maybeConfig.isEmpty() || !maybeConfig.get().isEnabled()) {
            log.warn("Telegram update received for unknown or disabled webhook secret");
            return;
        }
        TelegramBotConfigEntity config = maybeConfig.get();

        JsonNode message = update.path("message");
        JsonNode textNode = message.path("text");
        JsonNode chatIdNode = message.path("chat").path("id");
        if (message.isMissingNode() || textNode.isMissingNode() || chatIdNode.isMissingNode()) {
            return; // non-text update (edited message, sticker, join event, etc.) — nothing to answer
        }

        long chatId = chatIdNode.asLong();
        String text = textNode.asText();

        if (text.trim().startsWith("/start")) {
            sendStartGreeting(config, chatId);
            return;
        }

        try {
            UUID conversationId = findExistingConversationId(config.getOrganizationId(), chatId);
            ChatRequest request = new ChatRequest(config.getOrganizationId(), conversationId, text, null);
            ChatResponse response = agentService.chat(request);

            if (conversationId == null) {
                saveConversationMapping(config.getOrganizationId(), chatId, response.conversationId());
            }

            String reply = telegramFormatter.format(response.message());
            telegramClient.sendMessage(config.getBotToken(), chatId, reply);
        } catch (Exception e) {
            log.error("Failed to handle Telegram message for organization {}: {}", config.getOrganizationId(), e.getMessage(), e);
            try {
                telegramClient.sendMessage(config.getBotToken(), chatId,
                        "Kechirasiz, so'rovingizni qayta ishlashda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.");
            } catch (Exception ignored) {
                // best-effort — if even the error notice fails, there's nothing more to do here
            }
        }
    }

    /**
     * /start never reaches the AI — it's a Telegram-only convention with no natural-language
     * content, so the model has nothing to detect a language from and tends to answer in English.
     * Answering it directly also saves an LLM call for a message that needs no AI at all.
     */
    private void sendStartGreeting(TelegramBotConfigEntity config, long chatId) {
        String orgName = organizationRepository.findById(config.getOrganizationId())
                .map(org -> org.getName())
                .orElse("tashkilot");
        String greeting = "Assalomu alaykum! Men " + orgName + " uchun AI yordamchiman. "
                + "Savolingizni shu yerga yozing — imkon qadar tez va aniq javob berishga harakat qilaman.";
        telegramClient.sendMessage(config.getBotToken(), chatId, greeting);
    }

    private UUID findExistingConversationId(UUID organizationId, long chatId) {
        return telegramConversationRepository.findByOrganizationIdAndTelegramChatId(organizationId, chatId)
                .map(TelegramConversationEntity::getConversationId)
                .orElse(null);
    }

    private void saveConversationMapping(UUID organizationId, long chatId, UUID conversationId) {
        TelegramConversationEntity mapping = TelegramConversationEntity.builder()
                .organizationId(organizationId)
                .telegramChatId(chatId)
                .conversationId(conversationId)
                .build();
        telegramConversationRepository.save(mapping);
    }

    private String buildWebhookUrl(String webhookSecret) {
        return publicBaseUrl.replaceAll("/+$", "") + "/api/v1/telegram/webhook/" + webhookSecret;
    }

    private String generateSecret() {
        byte[] bytes = new byte[24];
        new SecureRandom().nextBytes(bytes);
        StringBuilder sb = new StringBuilder("tg_");
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private TelegramBotConfigResponse toResponse(TelegramBotConfigEntity config, String webhookUrl) {
        String token = config.getBotToken();
        String masked = token.length() > 10
                ? token.substring(0, 6) + "..." + token.substring(token.length() - 4)
                : "***";
        return new TelegramBotConfigResponse(
                config.getOrganizationId(),
                config.getBotUsername(),
                masked,
                webhookUrl,
                config.isEnabled()
        );
    }
}
