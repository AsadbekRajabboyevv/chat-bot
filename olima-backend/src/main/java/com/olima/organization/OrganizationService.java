package com.olima.organization;

import com.olima.organization.dto.OrganizationRequest;
import com.olima.organization.dto.OrganizationResponse;

import java.util.List;
import java.util.UUID;

public interface OrganizationService {
    List<OrganizationResponse> findAll();
    OrganizationResponse findById(UUID id);
    OrganizationResponse findBySlug(String slug);
    OrganizationResponse create(OrganizationRequest request);
    OrganizationResponse update(UUID id, OrganizationRequest request);
    void delete(UUID id);
}
