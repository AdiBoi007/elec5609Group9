package com.pulse.dto;

import com.pulse.dto.AiDtos.*;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class PlanDtos {
    private PlanDtos() {}
    public record WorkoutPlanRecord(Long id, String name, String goal, int daysPerWeek, boolean saved,
        Instant createdAt, WorkoutPlanResponse plan) {}
    public record MealPlanRecord(Long id, String name, int calorieTarget, boolean saved,
        Instant createdAt, MealPlanResponse plan) {}
    public record GroceryItemRequest(@NotBlank @Size(max = 150) String name,
        @Positive @DecimalMax("100000.0") Double quantity, @NotBlank @Size(max = 30) String unit,
        @Size(max = 60) String category) {}
    public record GroceryItemUpdate(@Pattern(regexp = ".*\\S.*", message = "must not be blank") @Size(max = 150) String name,
        @Positive @DecimalMax("100000.0") Double quantity,
        @Pattern(regexp = ".*\\S.*", message = "must not be blank") @Size(max = 30) String unit,
        @Size(max = 60) String category, Boolean checked) {}
    public record GroceryItemResponse(Long id, String name, Double quantity, String unit, String category, boolean checked) {}
    public record GroceryListResponse(Long id, Long mealPlanId, String name, Instant createdAt, List<GroceryItemResponse> items) {}
}
