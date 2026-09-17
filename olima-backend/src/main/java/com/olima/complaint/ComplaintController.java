package com.olima.complaint;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/complaints")
@RequiredArgsConstructor
public class ComplaintController {
    private final ComplaintService complaintService;

    @GetMapping
    public ResponseEntity<List<ComplaintEntity>> findByOrganization(@RequestParam UUID organizationId) {
        return ResponseEntity.ok(complaintService.findByOrganization(organizationId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ComplaintEntity> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(complaintService.findById(id));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<ComplaintEntity> confirm(@PathVariable UUID id) {
        return ResponseEntity.ok(complaintService.confirm(id));
    }
}
