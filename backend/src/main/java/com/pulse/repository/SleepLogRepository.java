package com.pulse.repository;

import com.pulse.entity.SleepLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.time.LocalDateTime;

public interface SleepLogRepository extends JpaRepository<SleepLog, Long> {
    List<SleepLog> findTop7ByUserIdOrderByStartedAtDesc(Long userId);
    List<SleepLog> findByUserIdOrderByStartedAtDesc(Long userId);
    List<SleepLog> findByUserIdAndStartedAtBetweenOrderByStartedAt(Long userId, LocalDateTime start, LocalDateTime end);
}
