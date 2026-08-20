package com.pulse.repository;

import com.pulse.entity.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {
    List<Reminder> findByUserIdOrderByType(Long userId);
    Optional<Reminder> findByUserIdAndTypeIgnoreCase(Long userId, String type);
}
