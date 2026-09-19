package com.olima.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.olima.security.JwtAuthenticationFilter;
import com.olima.security.OrganizationScopeFilter;
import com.olima.security.WidgetKeyFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final OrganizationScopeFilter organizationScopeFilter;
    private final ObjectMapper objectMapper;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        // Chat mijoz saytidagi widget uchun ochiq bo'lishi shart — u JWT ololmaydi.
                        // Himoya WidgetKeyFilter'da: kalitsiz 401, noto'g'ri kalit 403.
                        .requestMatchers("/api/v1/chat/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                writeError(response, 401, "Unauthorized", "Authentication is required"))
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                writeError(response, 403, "Forbidden", "You do not have permission to perform this action")))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(widgetKeyFilter, JwtAuthenticationFilter.class)
                .addFilterAfter(organizationScopeFilter, WidgetKeyFilter.class);

        return http.build();
    }

    private void writeError(jakarta.servlet.http.HttpServletResponse response, int status, String error, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status);
        body.put("error", error);
        body.put("message", message);
        body.put("timestamp", Instant.now().toString());
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    /**
     * Ruxsat etilgan origin naqshlari. Sozlamadan keladi, chunki har yangi domen
     * yoki port uchun qayta yig'ish kerak bo'lmasligi lozim. Naqsh ishlatiladi:
     * setAllowedOrigins() joker belgini qabul qilmaydi.
     *
     * Diqqat: panel backend bilan bir xil origin'da bo'lsa ham brauzer POST'da
     * Origin sarlavhasini yuboradi va bu ro'yxat baribir tekshiriladi —
     * ya'ni serverning o'z manzili ham shu yerda bo'lishi shart.
     */
    @Value("${app.cors.allowed-origin-patterns}")
    private List<String> allowedOriginPatterns;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(allowedOriginPatterns);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        java.util.List<String> patterns = java.util.Arrays.stream(allowedOriginPatterns.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
        configuration.setAllowedOriginPatterns(patterns.isEmpty() ? java.util.List.of("*") : patterns);
        configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(java.util.List.of("*"));
        configuration.setExposedHeaders(java.util.List.of("Authorization", "Link", "X-Total-Count"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
