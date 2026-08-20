package com.pulse.repository;

import com.pulse.entity.GeneratedWorkoutPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GeneratedWorkoutPlanRepository extends JpaRepository<GeneratedWorkoutPlan, Long> {
    List<GeneratedWorkoutPlan> findByUserIdOrderByCreatedAtDesc(Long userId);
}
