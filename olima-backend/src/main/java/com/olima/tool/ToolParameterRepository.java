package com.olima.tool;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ToolParameterRepository extends JpaRepository<ToolParameterEntity, UUID> {
}
