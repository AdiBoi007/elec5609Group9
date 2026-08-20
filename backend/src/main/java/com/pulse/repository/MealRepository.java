package com.pulse.repository;

import com.pulse.entity.Meal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface MealRepository extends JpaRepository<Meal, Long> {
    List<Meal> findByUserIdAndEatenAtBetween(Long userId, LocalDateTime start, LocalDateTime end);
    List<Meal> findByUserIdOrderByEatenAtDesc(Long userId);
}
