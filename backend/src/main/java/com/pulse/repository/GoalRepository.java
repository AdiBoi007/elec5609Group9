package com.pulse.repository;

import com.pulse.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    List<Goal> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Goal> findByUserIdAndStatusOrderByCreatedAtDesc(Long userId, Goal.Status status);
    Optional<Goal> findByIdAndUserId(Long id, Long userId);
}
