package com.pulse.dto;

import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;
import com.pulse.dto.DietaryProfileDtos.DietaryProfileInput;

public final class AiDtos {
    private AiDtos() {}
    public record InsightRequest(Map<String, Object> profile, List<Map<String, Object>> workouts,
        List<Map<String, Object>> nutrition, List<Map<String, Object>> sleep,
        List<Map<String, Object>> bodyMeasurements) {}
    public record InsightResponse(String summary, List<String> wins, List<String> attentionAreas,
        List<String> recommendations, String disclaimer, boolean generatedByAi) {}
    public record WorkoutPlanRequest(@NotBlank @Size(max = 100) String fitnessGoal, @NotBlank @Size(max = 60) String experienceLevel,
        @Min(1) @Max(7) int daysPerWeek, @Min(15) @Max(180) int workoutDuration,
        @NotEmpty @Size(max = 20) List<@NotBlank @Size(max = 100) String> availableEquipment,
        @Size(max = 1000) String preferences) {}
    public record WorkoutExercisePlan(String name, int sets, String reps, int restSeconds, String notes) {}
    public record WorkoutDay(String name, String focus, List<WorkoutExercisePlan> exercises) {}
    public record WorkoutPlanResponse(String name, String goal, String summary, List<WorkoutDay> days, String disclaimer, boolean generatedByAi) {}

    public record MealPlanRequest(@Min(1000) @Max(6000) int calorieTarget,
        @Min(40) @Max(400) int proteinTarget, @Min(50) @Max(800) int carbohydrateTarget,
        @Min(20) @Max(250) int fatTarget, @NotBlank @Size(max = 150) String dietaryPreference,
        @Size(max = 1000) String allergies, @Size(max = 1000) String dislikedFoods,
        @Min(2) @Max(6) int mealsPerDay, DietaryProfileInput dietaryProfile) {
        public MealPlanRequest(int calorieTarget, int proteinTarget, int carbohydrateTarget, int fatTarget,
            String dietaryPreference, String allergies, String dislikedFoods, int mealsPerDay) {
            this(calorieTarget, proteinTarget, carbohydrateTarget, fatTarget, dietaryPreference, allergies, dislikedFoods, mealsPerDay, null);
        }
    }
    public record Ingredient(String name, double quantity, String unit) {}
    public record PlannedMeal(String name, int calories, int protein, int carbohydrates, int fat,
        List<Ingredient> ingredients) {}
    public record MealPlanDay(String day, List<PlannedMeal> meals) {}
    public record MealPlanResponse(String name, String summary, List<MealPlanDay> days,
        String disclaimer, boolean generatedByAi) {}
}
