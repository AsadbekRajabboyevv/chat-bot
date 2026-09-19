package com.olima.organization;

import com.olima.organization.dto.WidgetConfigResponse;
import com.olima.security.AuthenticatedUser;
import com.olima.security.WidgetKeyFilter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Widget mijoz saytida ochilganda o'z sozlamalarini oladi.
 *
 * Yo'l ataylab /api/v1/chat ostida: u yerda WidgetKeyFilter kalitni tekshiradi va tashkilotni
 * SERVER tomonda aniqlaydi — ya'ni bu endpoint hech qachon so'rovdagi organizationId ga ishonmaydi.
 */
@RestController
@RequiredArgsConstructor
public class WidgetConfigController {

    private final OrganizationService organizationService;

    @GetMapping("/api/v1/chat/widget-config")
    public ResponseEntity<WidgetConfigResponse> config(HttpServletRequest request) {
        UUID orgId = (UUID) request.getAttribute(WidgetKeyFilter.WIDGET_ORG_ATTR);
        if (orgId == null) {
            // Panelga kirgan admin (JWT) — o'z tashkiloti
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser user) {
                orgId = user.organizationId();
            }
        }
        if (orgId == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok()
            // Panelda matn o'zgarsa mijoz saytida keyingi yangilashda ko'rinsin
            .cacheControl(CacheControl.noCache())
            .body(organizationService.widgetConfig(orgId));
    }
}
