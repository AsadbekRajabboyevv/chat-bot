package com.olima.tool;

import com.olima.tool.dto.ToolRequest;
import com.olima.tool.dto.ToolResponse;
import com.olima.tool.exception.ToolNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ToolServiceImpl implements ToolService {
    private final ToolRepository toolRepository;
    private final ToolMapper toolMapper;

    @Override
    public List<ToolResponse> findByOrganization(UUID orgId) {
        return toolRepository.findByOrganizationId(orgId).stream()
            .map(toolMapper::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    public ToolResponse findById(UUID id) {
        return toolRepository.findById(id)
            .map(toolMapper::toResponse)
            .orElseThrow(() -> new ToolNotFoundException("Tool not found"));
    }

    @Override
    @Transactional
    public ToolResponse create(UUID orgId, ToolRequest request) {
        if (toolRepository.findByOrganizationIdAndName(orgId, request.name()).isPresent()) {
            throw new IllegalArgumentException("Tool with this name already exists in organization");
        }
        ToolEntity tool = toolMapper.toEntity(request);
        tool.setOrganizationId(orgId);
        return toolMapper.toResponse(toolRepository.save(tool));
    }

    @Override
    @Transactional
    public ToolResponse update(UUID id, ToolRequest request) {
        ToolEntity tool = toolRepository.findById(id)
            .orElseThrow(() -> new ToolNotFoundException("Tool not found"));
        
        if (!tool.getName().equals(request.name()) && 
            toolRepository.findByOrganizationIdAndName(tool.getOrganizationId(), request.name()).isPresent()) {
            throw new IllegalArgumentException("Tool with this name already exists in organization");
        }

        tool.setName(request.name());
        tool.setDescription(request.description());
        tool.setType(request.type());
        tool.setConfiguration(request.configuration());
        tool.setRequiresConfirmation(request.requiresConfirmation());
        tool.setAccessLevel(request.accessLevel());
        
        tool.getParameters().clear();
        if (request.parameters() != null) {
            tool.getParameters().addAll(request.parameters().stream()
                .map(p -> toolMapper.toParameterEntity(p, tool))
                .toList());
        }

        return toolMapper.toResponse(toolRepository.save(tool));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        if (!toolRepository.existsById(id)) {
            throw new ToolNotFoundException("Tool not found");
        }
        toolRepository.deleteById(id);
    }

    @Override
    @Transactional
    public ToolResponse toggleEnabled(UUID id, boolean enabled) {
        ToolEntity tool = toolRepository.findById(id)
            .orElseThrow(() -> new ToolNotFoundException("Tool not found"));
        tool.setEnabled(enabled);
        return toolMapper.toResponse(toolRepository.save(tool));
    }
}
