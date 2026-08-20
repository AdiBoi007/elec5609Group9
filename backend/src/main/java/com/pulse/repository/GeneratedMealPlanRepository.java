package com.pulse.repository;

import com.pulse.entity.GeneratedMealPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GeneratedMealPlanRepository extends JpaRepository<GeneratedMealPlan, Long> {
    List<GeneratedMealPlan> findByUserIdOrderByCreatedAtDesc(Long userId);
}
