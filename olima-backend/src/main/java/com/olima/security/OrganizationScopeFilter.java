package com.olima.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.olima.complaint.ComplaintEntity;
import com.olima.complaint.ComplaintRepository;
import com.olima.conversation.ConversationEntity;
import com.olima.conversation.ConversationRepository;
import com.olima.knowledge.KnowledgeBaseEntity;
import com.olima.knowledge.KnowledgeBaseRepository;
import com.olima.tool.ToolEntity;
import com.olima.tool.ToolRepository;
import com.olima.user.UserRole;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Confines an ORG_ADMIN to their own organization's data. Runs after {@link JwtAuthenticationFilter}
 * so the authenticated principal is already on the security context.
 *
 * It covers the two URL shapes used across the API: an "organizationId" query/body-less request
 * param (list/create endpoints) and a path segment that IS the resource's own id, which is
 * resolved to its owning organization via a lookup for anything that isn't the organization
 * entity itself. Endpoints that carry the organization id only inside a JSON body (chat) are
 * validated separately where that request is handled.
 */
@Component
@RequiredArgsConstructor
public class OrganizationScopeFilter extends OncePerRequestFilter {

    private static final String UUID_RE = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
    private static final Pattern ORGANIZATION_PATH = Pattern.compile("^/api/v1/organizations/(" + UUID_RE + ")(/.*)?$");
    private static final Pattern TOOL_PATH = Pattern.compile("^/api/v1/tools/(" + UUID_RE + ")(/.*)?$");
    private static final Pattern COMPLAINT_PATH = Pattern.compile("^/api/v1/complaints/(" + UUID_RE + ")(/.*)?$");
    private static final Pattern CONVERSATION_PATH = Pattern.compile("^/api/v1/conversations/(" + UUID_RE + ")$");
    private static final Pattern KNOWLEDGE_BASE_PATH = Pattern.compile("^/api/v1/knowledge/bases/(" + UUID_RE + ")(/.*)?$");

    private final ToolRepository toolRepository;
    private final ComplaintRepository complaintRepository;
    private final ConversationRepository conversationRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser user && user.role() == UserRole.ORG_ADMIN) {
            UUID targetOrgId = resolveTargetOrganizationId(request, request.getRequestURI());
            if (targetOrgId != null && !targetOrgId.equals(user.organizationId())) {
                writeForbidden(response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private UUID resolveTargetOrganizationId(HttpServletRequest request, String path) {
        String orgParam = request.getParameter("organizationId");
        if (orgParam != null) {
            try {
                return UUID.fromString(orgParam);
            } catch (IllegalArgumentException ignored) {
                return null; // malformed id — let the controller reject it with a 400
            }
        }

        Matcher matcher;
        if ((matcher = ORGANIZATION_PATH.matcher(path)).matches()) {
            return UUID.fromString(matcher.group(1));
        }
        if ((matcher = TOOL_PATH.matcher(path)).matches()) {
            return lookup(toolRepository.findById(UUID.fromString(matcher.group(1))).map(ToolEntity::getOrganizationId));
        }
        if ((matcher = COMPLAINT_PATH.matcher(path)).matches()) {
            return lookup(complaintRepository.findById(UUID.fromString(matcher.group(1))).map(ComplaintEntity::getOrganizationId));
        }
        if ((matcher = CONVERSATION_PATH.matcher(path)).matches()) {
            return lookup(conversationRepository.findById(UUID.fromString(matcher.group(1))).map(ConversationEntity::getOrganizationId));
        }
        if ((matcher = KNOWLEDGE_BASE_PATH.matcher(path)).matches()) {
            return lookup(knowledgeBaseRepository.findById(UUID.fromString(matcher.group(1))).map(KnowledgeBaseEntity::getOrganizationId));
        }
        return null;
    }

    private UUID lookup(Optional<UUID> maybeOrgId) {
        return maybeOrgId.orElse(null);
    }

    private void writeForbidden(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 403);
        body.put("error", "Forbidden");
        body.put("message", "You do not have access to this organization's data");
        body.put("timestamp", Instant.now().toString());
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
