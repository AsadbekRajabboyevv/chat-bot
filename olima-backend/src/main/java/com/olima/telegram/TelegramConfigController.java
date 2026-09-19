package com.olima.telegram;

import com.olima.telegram.dto.TelegramBotConfigRequest;
import com.olima.telegram.dto.TelegramBotConfigResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Management endpoints for an organization's Telegram bot. The "organizationId" request param
 * is enough for OrganizationScopeFilter to confine an ORG_ADMIN to their own organization here,
 * the same way it already does for tools/knowledge/etc.
 */
@RestController
@RequestMapping("/api/v1/telegram/config")
@RequiredArgsConstructor
public class TelegramConfigController {
    private final TelegramService telegramService;

    @GetMapping
    public ResponseEntity<TelegramBotConfigResponse> getConfig(@RequestParam UUID organizationId) {
        TelegramBotConfigResponse config = telegramService.getConfig(organizationId);
        return config != null ? ResponseEntity.ok(config) : ResponseEntity.noContent().build();
    }

    @PostMapping
    public ResponseEntity<TelegramBotConfigResponse> saveConfig(
            @RequestParam UUID organizationId,
            @RequestBody @Valid TelegramBotConfigRequest request) {
        return ResponseEntity.ok(telegramService.configureBot(organizationId, request));
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteConfig(@RequestParam UUID organizationId) {
        telegramService.disconnectBot(organizationId);
        return ResponseEntity.ok().build();
    }
}
