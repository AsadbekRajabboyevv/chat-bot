package com.olima.tool;

import com.olima.tool.dto.ToolRequest;
import com.olima.tool.dto.ToolResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ToolController {
    private final ToolService toolService;

    @GetMapping("/api/v1/organizations/{organizationId}/tools")
    public ResponseEntity<List<ToolResponse>> findByOrganization(@PathVariable UUID organizationId) {
        return ResponseEntity.ok(toolService.findByOrganization(organizationId));
    }

    @GetMapping(value = "/api/v1/tools", params = "organizationId")
    public ResponseEntity<List<ToolResponse>> findByOrganizationParam(@RequestParam UUID organizationId) {
        return ResponseEntity.ok(toolService.findByOrganization(organizationId));
    }

    @PostMapping("/api/v1/organizations/{organizationId}/tools")
    public ResponseEntity<ToolResponse> create(
            @PathVariable UUID organizationId,
            @RequestBody @Valid ToolRequest request) {
        return ResponseEntity.ok(toolService.create(organizationId, request));
    }

    @PostMapping(value = "/api/v1/tools", params = "organizationId")
    public ResponseEntity<ToolResponse> createWithParam(
            @RequestParam UUID organizationId,
            @RequestBody @Valid ToolRequest request) {
        return ResponseEntity.ok(toolService.create(organizationId, request));
    }

    @GetMapping("/api/v1/tools/{id}")
    public ResponseEntity<ToolResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(toolService.findById(id));
    }

    @PutMapping("/api/v1/tools/{id}")
    public ResponseEntity<ToolResponse> update(
            @PathVariable UUID id,
            @RequestBody @Valid ToolRequest request) {
        return ResponseEntity.ok(toolService.update(id, request));
    }

    @DeleteMapping("/api/v1/tools/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        toolService.delete(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/api/v1/tools/{id}/toggle")
    public ResponseEntity<ToolResponse> toggleEnabled(
            @PathVariable UUID id,
            @RequestParam(required = false) Boolean enabled,
            @RequestBody(required = false) java.util.Map<String, Object> body) {
        boolean isEnabled = enabled != null ? enabled : 
            (body != null && body.containsKey("enabled") ? Boolean.parseBoolean(String.valueOf(body.get("enabled"))) : true);
        return ResponseEntity.ok(toolService.toggleEnabled(id, isEnabled));
    }
}
