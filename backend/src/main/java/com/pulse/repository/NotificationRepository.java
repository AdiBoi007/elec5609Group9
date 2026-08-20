package com.pulse.repository;

import com.pulse.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.time.Instant;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop20ByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndReadAtIsNull(Long userId);
    boolean existsByUserIdAndTypeAndCreatedAtBetween(Long userId, String type, Instant from, Instant to);
}
