package com.olima.organization;

import com.olima.organization.dto.OrganizationRequest;
import com.olima.organization.dto.OrganizationResponse;
import com.olima.organization.exception.OrganizationNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrganizationServiceImpl implements OrganizationService {
    private final OrganizationRepository organizationRepository;
    private final OrganizationMapper organizationMapper;

    @Override
    public List<OrganizationResponse> findAll() {
        return organizationRepository.findAll().stream()
            .map(organizationMapper::toResponse)
            .toList();
    }

    @Override
    public OrganizationResponse findById(UUID id) {
        return organizationRepository.findById(id)
            .map(organizationMapper::toResponse)
            .orElseThrow(() -> new OrganizationNotFoundException("Organization not found"));
    }

    @Override
    public OrganizationResponse findBySlug(String slug) {
        return organizationRepository.findBySlug(slug)
            .map(organizationMapper::toResponse)
            .orElseThrow(() -> new OrganizationNotFoundException("Organization not found"));
    }

    @Override
    @Transactional
    public OrganizationResponse create(OrganizationRequest request) {
        String slug = request.name().toLowerCase().replace(" ", "-");
        if (organizationRepository.findBySlug(slug).isPresent()) {
            throw new IllegalArgumentException("Organization with this name already exists");
        }
        OrganizationEntity entity = organizationMapper.toEntity(request);
        entity.setSlug(slug);
        return organizationMapper.toResponse(organizationRepository.save(entity));
    }

    @Override
    @Transactional
    public OrganizationResponse update(UUID id, OrganizationRequest request) {
        OrganizationEntity entity = organizationRepository.findById(id)
            .orElseThrow(() -> new OrganizationNotFoundException("Organization not found"));
        entity.setName(request.name());
        entity.setDescription(request.description());
        String slug = request.name().toLowerCase().replace(" ", "-");
        if (!slug.equals(entity.getSlug()) && organizationRepository.findBySlug(slug).isPresent()) {
            throw new IllegalArgumentException("Organization with this name already exists");
        }
        entity.setSlug(slug);
        return organizationMapper.toResponse(organizationRepository.save(entity));
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        if (!organizationRepository.existsById(id)) {
            throw new OrganizationNotFoundException("Organization not found");
        }
        organizationRepository.deleteById(id);
    }
}
