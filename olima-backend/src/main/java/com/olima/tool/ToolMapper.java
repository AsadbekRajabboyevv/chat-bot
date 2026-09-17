package com.olima.tool;

import com.olima.tool.dto.ToolParameterRequest;
import com.olima.tool.dto.ToolParameterResponse;
import com.olima.tool.dto.ToolRequest;
import com.olima.tool.dto.ToolResponse;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class ToolMapper {

    public ToolResponse toResponse(ToolEntity entity) {
        return new ToolResponse(
            entity.getId(),
            entity.getOrganizationId(),
            entity.getName(),
            entity.getDescription(),
            entity.getType(),
            entity.getConfiguration(),
            entity.isEnabled(),
            entity.isRequiresConfirmation(),
            entity.getAccessLevel(),
            entity.getParameters().stream().map(this::toParameterResponse).collect(Collectors.toList()),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private ToolParameterResponse toParameterResponse(ToolParameterEntity entity) {
        return new ToolParameterResponse(
            entity.getId(),
            entity.getName(),
            entity.getType(),
            entity.getDescription(),
            entity.isRequired(),
            entity.getDefaultValue()
        );
    }

    public ToolEntity toEntity(ToolRequest request) {
        ToolEntity entity = ToolEntity.builder()
            .name(request.name())
            .description(request.description())
            .type(request.type())
            .configuration(request.configuration())
            .requiresConfirmation(request.requiresConfirmation())
            .accessLevel(request.accessLevel())
            .enabled(true)
            .build();

        if (request.parameters() != null) {
            entity.setParameters(request.parameters().stream()
                .map(p -> toParameterEntity(p, entity))
                .collect(Collectors.toList()));
        }

        return entity;
    }

    public ToolParameterEntity toParameterEntity(ToolParameterRequest request, ToolEntity tool) {
        return ToolParameterEntity.builder()
            .tool(tool)
            .name(request.name())
            .type(request.type())
            .description(request.description())
            .required(request.required())
            .defaultValue(request.defaultValue())
            .build();
    }
}
