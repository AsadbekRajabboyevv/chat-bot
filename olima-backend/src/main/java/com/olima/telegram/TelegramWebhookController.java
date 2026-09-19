package com.olima.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.CompletableFuture;

/**
 * Receives updates pushed by Telegram. Public by design (Telegram cannot obtain a JWT) — the
 * webhook secret in the path is what identifies and authorizes the organization; see
 * SecurityConfig for why this path is permitted through unauthenticated.
 *
 * The body is bound as a raw String, not JsonNode: this app's Spring version does its own
 * @RequestBody conversion through Jackson 3 (tools.jackson.*) internally, which doesn't know
 * how to produce a classic com.fasterxml.jackson.databind.JsonNode. Parsing it ourselves with
 * the app's own (Jackson 2) ObjectMapper — the same one every other service here already uses —
 * sidesteps that mismatch entirely.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/telegram")
@RequiredArgsConstructor
public class TelegramWebhookController {
    private final TelegramService telegramService;
    private final ObjectMapper objectMapper;

    @PostMapping("/webhook/{webhookSecret}")
    public ResponseEntity<Void> receiveUpdate(@PathVariable String webhookSecret, @RequestBody String rawBody) {
        // Telegram expects a fast ack and retries on timeout — the actual AI call can take a
        // few seconds, so it runs after this method has already returned 200.
        CompletableFuture.runAsync(() -> {
            try {
                JsonNode update = objectMapper.readTree(rawBody);
                telegramService.handleIncomingUpdate(webhookSecret, update);
            } catch (Exception e) {
                log.error("Unhandled error processing Telegram update: {}", e.getMessage(), e);
            }
        });
        return ResponseEntity.ok().build();
    }
}
