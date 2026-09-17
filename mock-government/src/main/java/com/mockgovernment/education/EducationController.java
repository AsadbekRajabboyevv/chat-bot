package com.mockgovernment.education;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/education")
@RequiredArgsConstructor
public class EducationController {

    private final EducationService educationService;

    @GetMapping("/transfer-rules")
    public List<TransferRuleResponse> getTransferRules() {
        return educationService.getAllTransferRules();
    }

    @GetMapping("/academic-leave-rules")
    public List<AcademicLeaveRuleResponse> getAcademicLeaveRules() {
        return educationService.getAllAcademicLeaveRules();
    }
}
