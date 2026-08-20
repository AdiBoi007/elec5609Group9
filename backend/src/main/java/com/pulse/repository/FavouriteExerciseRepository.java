package com.pulse.repository;

import com.pulse.entity.FavouriteExercise;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FavouriteExerciseRepository extends JpaRepository<FavouriteExercise, Long> {
    List<FavouriteExercise> findByUserId(Long userId);
    Optional<FavouriteExercise> findByUserIdAndExerciseId(Long userId, Long exerciseId);
}
