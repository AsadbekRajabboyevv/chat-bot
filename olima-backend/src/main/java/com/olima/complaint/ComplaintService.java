package com.olima.complaint;

import java.util.List;
import java.util.UUID;

public interface ComplaintService {
    ComplaintEntity createDraft(UUID orgId, UUID convId, String subject, String description, String category);
    ComplaintEntity confirm(UUID complaintId);
    List<ComplaintEntity> findByOrganization(UUID orgId);
    ComplaintEntity findById(UUID id);
}
