package com.mockgovernment.complaint;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GovComplaintRepository extends JpaRepository<GovComplaintEntity, Long> {
}
