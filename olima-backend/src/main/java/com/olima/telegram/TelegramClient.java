package com.olima.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.olima.telegram.exception.TelegramApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/** Thin wrapper around Telegram's plain HTTP Bot API — no SDK needed, it's just JSON over REST. */
@Slf4j
@Component
@RequiredArgsConstructor
public class TelegramClient {
    private static final String BASE_URL = "https://api.telegram.org/bot";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    /** Validates the token and returns the bot's @username. */
    public String getBotUsername(String botToken) {
        JsonNode result = call(botToken, "getMe", null);
        JsonNode username = result.path("username");
        if (username.isMissingNode() || username.asText().isBlank()) {
            throw new TelegramApiException("Telegram did not return a bot username");
        }
        return username.asText();
    }

    public void setWebhook(String botToken, String webhookUrl, String secretToken) {
        call(botToken, "setWebhook", Map.of(
                "url", webhookUrl,
                "secret_token", secretToken,
                "allowed_updates", new String[]{"message"}
        ));
    }

    public void deleteWebhook(String botToken) {
        call(botToken, "deleteWebhook", Map.of());
    }

    public void sendMessage(String botToken, long chatId, String text) {
        try {
            call(botToken, "sendMessage", Map.of(
                    "chat_id", chatId,
                    "text", text,
                    "parse_mode", "Markdown"
            ));
        } catch (Exception e) {
            // The AI reply may contain characters Telegram's legacy Markdown parser rejects
            // (unbalanced * or _ especially) — retry once as plain text rather than losing the reply.
            log.warn("sendMessage with Markdown failed, retrying as plain text: {}", e.getMessage());
            call(botToken, "sendMessage", Map.of("chat_id", chatId, "text", text));
        }
    }

    private JsonNode call(String botToken, String method, Object body) {
        try {
            String url = BASE_URL + botToken + "/" + method;
            String response = (body == null)
                    ? restClient.get().uri(url).retrieve().body(String.class)
                    : restClient.post().uri(url).contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(String.class);

            JsonNode root = objectMapper.readTree(response);
            if (!root.path("ok").asBoolean(false)) {
                throw new TelegramApiException("Telegram API " + method + " failed: " + root.path("description").asText());
            }
            return root.path("result");
        } catch (TelegramApiException e) {
            throw e;
        } catch (Exception e) {
            throw new TelegramApiException("Telegram API " + method + " call failed: " + e.getMessage(), e);
        }
    }
}
