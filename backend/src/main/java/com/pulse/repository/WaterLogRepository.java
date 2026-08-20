package com.pulse.repository;

import com.pulse.entity.WaterLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WaterLogRepository extends JpaRepository<WaterLog, Long> {
    List<WaterLog> findByUserIdAndLoggedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);
    Optional<WaterLog> findFirstByUserIdOrderByLoggedAtDesc(Long userId);
}
