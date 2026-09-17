package com.mockgovernment.complaint;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ComplaintService {

    private final GovComplaintRepository govComplaintRepository;

    public ComplaintResponse createComplaint(ComplaintRequest request) {
        GovComplaintEntity entity = new GovComplaintEntity();
        entity.setSubject(request.subject());
        entity.setDescription(request.description());
        entity.setCategory(request.category());
        entity.setApplicantName(request.applicantName());
        entity.setApplicantEmail(request.applicantEmail());
        entity.setApplicantPhone(request.applicantPhone());
        entity.setStatus("RECEIVED");
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());

        GovComplaintEntity saved = govComplaintRepository.save(entity);

        return new ComplaintResponse(
                saved.getId(), saved.getSubject(), saved.getDescription(),
                saved.getCategory(), saved.getStatus(), saved.getApplicantName(),
                saved.getApplicantEmail(), saved.getApplicantPhone(),
                saved.getCreatedAt(), saved.getUpdatedAt()
        );
    }
}
