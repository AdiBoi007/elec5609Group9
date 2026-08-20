package com.pulse.controller;

import com.pulse.dto.AiDtos.*;
import com.pulse.dto.PlanDtos.*;
import com.pulse.service.PlanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api") @RequiredArgsConstructor
public class PlanController {
    private final PlanService plans;
    @PostMapping("/plans/workouts/generate") @ResponseStatus(HttpStatus.CREATED) WorkoutPlanRecord generateWorkout(Authentication auth, @Valid @RequestBody WorkoutPlanRequest request) { return plans.generateWorkout(auth.getName(), request); }
    @GetMapping("/plans/workouts") List<WorkoutPlanRecord> workoutPlans(Authentication auth) { return plans.workoutPlans(auth.getName()); }
    @GetMapping("/plans/workouts/{id}") WorkoutPlanRecord workoutPlan(Authentication auth, @PathVariable Long id) { return plans.workoutPlan(auth.getName(), id); }
    @DeleteMapping("/plans/workouts/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteWorkout(Authentication auth, @PathVariable Long id) { plans.deleteWorkoutPlan(auth.getName(), id); }
    @PostMapping("/plans/meals/generate") @ResponseStatus(HttpStatus.CREATED) MealPlanRecord generateMeal(Authentication auth, @Valid @RequestBody MealPlanRequest request) { return plans.generateMeal(auth.getName(), request); }
    @GetMapping("/plans/meals") List<MealPlanRecord> mealPlans(Authentication auth) { return plans.mealPlans(auth.getName()); }
    @GetMapping("/plans/meals/{id}") MealPlanRecord mealPlan(Authentication auth, @PathVariable Long id) { return plans.mealPlan(auth.getName(), id); }
    @DeleteMapping("/plans/meals/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteMeal(Authentication auth, @PathVariable Long id) { plans.deleteMealPlan(auth.getName(), id); }
    @PostMapping("/grocery-lists/from-meal-plan/{mealPlanId}") @ResponseStatus(HttpStatus.CREATED) GroceryListResponse generateGrocery(Authentication auth, @PathVariable Long mealPlanId) { return plans.generateGrocery(auth.getName(), mealPlanId); }
    @GetMapping("/grocery-lists") List<GroceryListResponse> groceryLists(Authentication auth) { return plans.groceryLists(auth.getName()); }
    @PostMapping("/grocery-lists/{listId}/items") @ResponseStatus(HttpStatus.CREATED) GroceryItemResponse addItem(Authentication auth, @PathVariable Long listId, @Valid @RequestBody GroceryItemRequest request) { return plans.addItem(auth.getName(), listId, request); }
    @PutMapping("/grocery-items/{itemId}") GroceryItemResponse updateItem(Authentication auth, @PathVariable Long itemId, @Valid @RequestBody GroceryItemUpdate request) { return plans.updateItem(auth.getName(), itemId, request); }
    @DeleteMapping("/grocery-items/{itemId}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteItem(Authentication auth, @PathVariable Long itemId) { plans.deleteItem(auth.getName(), itemId); }
    @DeleteMapping("/grocery-lists/{listId}/checked") @ResponseStatus(HttpStatus.NO_CONTENT) void clearChecked(Authentication auth, @PathVariable Long listId) { plans.clearChecked(auth.getName(), listId); }
}
