package com.olima.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.olima.organization.OrganizationEntity;
import com.olima.organization.OrganizationRepository;
import com.olima.user.UserRole;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Mijoz saytidagi widget uchun kirish: u panelga kira olmaydi, faqat chat qila oladi.
 *
 * Bungacha widget so'rov tanasida organizationId yuborardi. Widget ochiq sahifada turadi —
 * ya'ni har kim uni almashtirib BOSHQA mijozning hujjatlaridan javob olishi mumkin edi.
 * Endi tashkilot kalitdan, server tomonda aniqlanadi; tanadagi organizationId ga ishonilmaydi
 * (AgentService uni shu yerda qo'yilgan qiymat bilan almashtiradi).
 *
 * Kalit ikki yo'l bilan kelishi mumkin:
 *   - X-Widget-Key sarlavhasi — oddiy so'rovlar uchun
 *   - ?widgetKey= parametri  — SSE uchun, chunki EventSource maxsus sarlavha yubora olmaydi
 */
@Component
@RequiredArgsConstructor
public class WidgetKeyFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Widget-Key";
    public static final String PARAM = "widgetKey";
    private static final String CHAT_PREFIX = "/api/v1/chat";

    private final OrganizationRepository organizationRepository;
    private final ObjectMapper objectMapper;

    /** SseEmitter async redispatch'da ham ishlashi kerak — JwtAuthenticationFilter bilan bir xil sabab. */
    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (!request.getRequestURI().startsWith(CHAT_PREFIX)
                || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        // Panelga kirgan admin allaqachon JWT bilan tanilgan — unga kalit kerak emas.
        var existing = SecurityContextHolder.getContext().getAuthentication();
        if (existing != null && existing.isAuthenticated()
                && existing.getPrincipal() instanceof AuthenticatedUser) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = request.getHeader(HEADER);
        if (key == null || key.isBlank()) {
            key = request.getParameter(PARAM);
        }

        if (key == null || key.isBlank()) {
            writeError(response, 401, "Widget key required",
                    "Chat so'rovi uchun " + HEADER + " sarlavhasi yoki ?" + PARAM + " parametri kerak");
            return;
        }

        Optional<OrganizationEntity> org = organizationRepository.findByWidgetKeyAndEnabledTrue(key.trim());
        if (org.isEmpty()) {
            writeError(response, 403, "Invalid widget key", "Kalit topilmadi yoki tashkilot o'chirilgan");
            return;
        }

        UUID orgId = org.get().getId();
        var principal = new AuthenticatedUser(orgId, "widget:" + org.get().getSlug(), UserRole.ORG_ADMIN, orgId);
        var auth = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_WIDGET")));
        SecurityContextHolder.getContext().setAuthentication(auth);

        request.setAttribute(WIDGET_ORG_ATTR, orgId);
        filterChain.doFilter(request, response);
    }

    /** AgentService shu atribut bo'yicha so'rovdagi organizationId ni bekor qiladi. */
    public static final String WIDGET_ORG_ATTR = "olima.widget.organizationId";

    private void writeError(HttpServletResponse response, int status, String error, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status);
        body.put("error", error);
        body.put("message", message);
        body.put("timestamp", Instant.now().toString());
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
