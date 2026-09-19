package com.olima.execution;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.olima.tool.ToolEntity;
import com.olima.tool.ToolType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class RestApiToolExecutor implements ToolExecutor {
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    private static volatile Boolean mockGovResolvable = null;

    private static boolean isMockGovResolvable() {
        if (mockGovResolvable == null) {
            synchronized (RestApiToolExecutor.class) {
                if (mockGovResolvable == null) {
                    try {
                        java.net.InetAddress.getByName("mock-government");
                        mockGovResolvable = true;
                    } catch (Exception ex) {
                        mockGovResolvable = false;
                    }
                }
            }
        }
        return mockGovResolvable;
    }

    @Override
    public ToolType supportedType() {
        return ToolType.REST_API;
    }

    @Override
    public ToolResult execute(ToolEntity tool, Map<String, Object> parameters) {
        try {
            Map<String, Object> config = objectMapper.readValue(tool.getConfiguration(), Map.class);
            String url = (String) config.get("endpoint");
            if (url == null || url.isBlank()) {
                url = (String) config.get("url");
            }
            if (url == null || url.isBlank()) {
                return ToolResult.failure("Endpoint URL not configured for tool " + tool.getName());
            }
            String methodStr = (String) config.get("method");
            HttpMethod method = methodStr != null ? HttpMethod.valueOf(methodStr.toUpperCase()) : HttpMethod.GET;

            if (url.contains("mock-government") && !isMockGovResolvable()) {
                url = url.replace("mock-government", "localhost");
            }

            for (Map.Entry<String, Object> entry : parameters.entrySet()) {
                url = url.replace("{" + entry.getKey() + "}", String.valueOf(entry.getValue()));
            }

            if (method == HttpMethod.GET && !parameters.isEmpty()) {
                StringBuilder queryBuilder = new StringBuilder();
                for (Map.Entry<String, Object> entry : parameters.entrySet()) {
                    if (!tool.getConfiguration().contains("{" + entry.getKey() + "}") && entry.getValue() != null) {
                        if (queryBuilder.length() > 0) {
                            queryBuilder.append("&");
                        }
                        queryBuilder.append(java.net.URLEncoder.encode(entry.getKey(), java.nio.charset.StandardCharsets.UTF_8))
                                .append("=")
                                .append(java.net.URLEncoder.encode(String.valueOf(entry.getValue()), java.nio.charset.StandardCharsets.UTF_8));
                    }
                }
                if (queryBuilder.length() > 0) {
                    url += (url.contains("?") ? "&" : "?") + queryBuilder.toString();
                }
            }

            RestClient.RequestBodyUriSpec spec = restClient.method(method);
            RestClient.RequestBodySpec bodySpec = spec.uri(url);

            if (method == HttpMethod.POST || method == HttpMethod.PUT || method == HttpMethod.PATCH) {
                bodySpec.body(parameters);
            }

            String response;
            try {
                response = bodySpec.retrieve().body(String.class);
            } catch (org.springframework.web.client.HttpClientErrorException.NotFound nf) {
                if (!url.endsWith("/")) {
                    response = restClient.method(method).uri(url + "/").retrieve().body(String.class);
                } else {
                    throw nf;
                }
            }

            if (response == null || response.isBlank() || response.trim().equals("null")) {
                return ToolResult.failure("Ichki ma'lumotlar bazasida ma'lumot topilmadi.");
            }
            return ToolResult.success(response);
        } catch (Exception e) {
            return ToolResult.failure(e.getMessage());
        }
    }
}
