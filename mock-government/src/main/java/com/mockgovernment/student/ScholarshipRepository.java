package com.mockgovernment.student;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ScholarshipRepository extends JpaRepository<ScholarshipEntity, Long> {
    List<ScholarshipEntity> findByStudentIdAndActiveTrue(Long studentId);
}
