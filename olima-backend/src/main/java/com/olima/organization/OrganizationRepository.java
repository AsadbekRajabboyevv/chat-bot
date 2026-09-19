package com.olima.organization;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<OrganizationEntity, UUID> {
    Optional<OrganizationEntity> findBySlug(String slug);
    Optional<OrganizationEntity> findByWidgetKeyAndEnabledTrue(String widgetKey);
    List<OrganizationEntity> findByEnabledTrue();
}
