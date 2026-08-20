package com.pulse.repository;

import com.pulse.entity.Workout;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface WorkoutRepository extends JpaRepository<Workout, Long> {
    List<Workout> findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(Long userId, LocalDateTime start, LocalDateTime end);
}
