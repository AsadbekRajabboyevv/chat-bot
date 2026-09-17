package com.olima.organization;

import com.olima.organization.dto.OrganizationRequest;
import com.olima.organization.dto.OrganizationResponse;
import org.springframework.stereotype.Component;

@Component
public class OrganizationMapper {

    public OrganizationResponse toResponse(OrganizationEntity entity) {
        return new OrganizationResponse(
            entity.getId(),
            entity.getName(),
            entity.getSlug(),
            entity.getDescription(),
            entity.isEnabled(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    public OrganizationEntity toEntity(OrganizationRequest request) {
        return OrganizationEntity.builder()
            .name(request.name())
            .description(request.description())
            .enabled(true)
            .build();
    }
}
