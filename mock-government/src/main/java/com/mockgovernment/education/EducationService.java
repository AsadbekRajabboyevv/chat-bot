package com.mockgovernment.education;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EducationService {

    private final TransferRuleRepository transferRuleRepository;
    private final AcademicLeaveRuleRepository academicLeaveRuleRepository;

    public List<TransferRuleResponse> getAllTransferRules() {
        return transferRuleRepository.findAll().stream()
                .map(e -> new TransferRuleResponse(
                        e.getId(), e.getTitle(), e.getDescription(), e.getMinGpa(),
                        e.getMinCompletedYears(), e.getApplicationPeriod(), e.getRequiredDocuments(),
                        e.getAdditionalConditions()
                ))
                .toList();
    }

    public List<AcademicLeaveRuleResponse> getAllAcademicLeaveRules() {
        return academicLeaveRuleRepository.findAll().stream()
                .map(e -> new AcademicLeaveRuleResponse(
                        e.getId(), e.getTitle(), e.getDescription(), e.getValidReasons(),
                        e.getMaxDurationYears(), e.getRequiredDocuments(), e.getReinstatementProcedure()
                ))
                .toList();
    }
}
