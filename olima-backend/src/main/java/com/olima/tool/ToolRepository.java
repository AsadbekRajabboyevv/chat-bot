package com.olima.tool;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ToolRepository extends JpaRepository<ToolEntity, UUID> {
    List<ToolEntity> findByOrganizationIdAndEnabledTrue(UUID orgId);
    List<ToolEntity> findByOrganizationId(UUID orgId);
    Optional<ToolEntity> findByOrganizationIdAndName(UUID orgId, String name);
}
