package com.olima.complaint;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ComplaintServiceImpl implements ComplaintService {
    private final ComplaintRepository complaintRepository;

    @Override
    @Transactional
    public ComplaintEntity createDraft(UUID orgId, UUID convId, String subject, String description, String category) {
        ComplaintEntity complaint = ComplaintEntity.builder()
            .organizationId(orgId)
            .conversationId(convId)
            .subject(subject)
            .description(description)
            .category(category)
            .status(ComplaintStatus.DRAFT)
            .build();
        return complaintRepository.save(complaint);
    }

    @Override
    @Transactional
    public ComplaintEntity confirm(UUID complaintId) {
        ComplaintEntity complaint = findById(complaintId);
        complaint.setStatus(ComplaintStatus.CONFIRMED);
        return complaintRepository.save(complaint);
    }

    @Override
    public List<ComplaintEntity> findByOrganization(UUID orgId) {
        return complaintRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId);
    }

    @Override
    public ComplaintEntity findById(UUID id) {
        return complaintRepository.findById(id).orElseThrow(() -> new RuntimeException("Complaint not found"));
    }
}
