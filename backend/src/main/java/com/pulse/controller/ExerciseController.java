package com.pulse.controller;

import com.pulse.entity.Exercise;
import com.pulse.repository.ExerciseRepository;
import com.pulse.repository.FavouriteExerciseRepository;
import com.pulse.repository.UserRepository;
import com.pulse.entity.FavouriteExercise;
import com.pulse.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/exercises") @RequiredArgsConstructor
public class ExerciseController {
    private final ExerciseRepository exercises;
    private final FavouriteExerciseRepository favourites;
    private final UserRepository users;
    @GetMapping List<ExerciseResponse> list(Authentication auth, @RequestParam(defaultValue = "") String query,
        @RequestParam(defaultValue = "") String muscleGroup, @RequestParam(defaultValue = "") String equipment,
        @RequestParam(defaultValue = "") String difficulty, @RequestParam(defaultValue = "false") boolean favouritesOnly) {
        User user = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        var favouriteIds = favourites.findByUserId(user.getId()).stream().map(item -> item.getExercise().getId()).collect(java.util.stream.Collectors.toSet());
        return exercises.findByNameContainingIgnoreCase(query).stream()
            .filter(e -> muscleGroup.isBlank() || muscleGroup.equalsIgnoreCase(e.getMuscleGroup()))
            .filter(e -> equipment.isBlank() || equipment.equalsIgnoreCase(e.getEquipment()))
            .filter(e -> difficulty.isBlank() || difficulty.equalsIgnoreCase(e.getDifficulty()))
            .filter(e -> !favouritesOnly || favouriteIds.contains(e.getId()))
            .map(e -> ExerciseResponse.from(e, favouriteIds.contains(e.getId()))).toList();
    }
    @PutMapping("/{id}/favourite") @Transactional ExerciseResponse favourite(Authentication auth, @PathVariable Long id) {
        User user = users.findByEmailIgnoreCase(auth.getName()).orElseThrow(); Exercise exercise = exercises.findById(id).orElseThrow(() -> new IllegalArgumentException("Exercise not found"));
        favourites.findByUserIdAndExerciseId(user.getId(), id).orElseGet(() -> { FavouriteExercise item = new FavouriteExercise(); item.setUser(user); item.setExercise(exercise); return favourites.save(item); });
        return ExerciseResponse.from(exercise, true);
    }
    @DeleteMapping("/{id}/favourite") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional void unfavourite(Authentication auth, @PathVariable Long id) {
        User user = users.findByEmailIgnoreCase(auth.getName()).orElseThrow(); favourites.findByUserIdAndExerciseId(user.getId(), id).ifPresent(favourites::delete);
    }
    public record ExerciseResponse(Long id, String name, String muscleGroup, String equipment, String difficulty, String instructions, String mediaUrl, boolean favourite) {
        static ExerciseResponse from(Exercise e, boolean favourite) { return new ExerciseResponse(e.getId(), e.getName(), e.getMuscleGroup(), e.getEquipment(), e.getDifficulty(), e.getInstructions(), e.getMediaUrl(), favourite); }
    }
}
