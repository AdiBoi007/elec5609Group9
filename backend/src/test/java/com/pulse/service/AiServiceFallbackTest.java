package com.pulse.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.dto.AiDtos.*;
import com.pulse.dto.DietaryProfileDtos.DietaryProfileInput;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;

class AiServiceFallbackTest {
    private final AiService service = new AiService("", "gpt-test", new ObjectMapper());

    @Test void createsStructuredWorkoutFallbackWithoutApiKey() {
        var result = service.workoutPlan(new WorkoutPlanRequest("Muscle Gain", "Intermediate", 4, 60, List.of("Dumbbells"), "No jumping"));
        assertThat(result.generatedByAi()).isFalse();
        assertThat(result.days()).hasSize(4);
        assertThat(result.days().get(0).exercises()).allSatisfy(exercise -> assertThat(exercise.name()).isNotBlank());
    }

    @Test void bodyweightFallbackDoesNotInventGymEquipment() {
        var result = service.workoutPlan(new WorkoutPlanRequest("General Fitness", "Beginner", 3, 30, List.of("None"), "Home workouts"));
        assertThat(result.days()).flatExtracting(WorkoutDay::exercises).extracting(WorkoutExercisePlan::name)
            .allMatch(name -> Set.of("Push-up", "Bulgarian Split Squat", "Glute Bridge", "Plank", "Burpee").contains(name));
    }

    @Test void createsSevenDayMealFallbackWithoutApiKey() {
        var result = service.mealPlan(new MealPlanRequest(2200, 150, 250, 70, "Balanced", "None", "Olives", 4));
        assertThat(result.generatedByAi()).isFalse();
        assertThat(result.days()).hasSize(7);
        assertThat(result.days().get(0).meals()).hasSize(4);
    }

    @Test void veganFallbackRespectsCoreExclusions() {
        var result = service.mealPlan(new MealPlanRequest(2200, 150, 250, 70, "Vegan", "Dairy, eggs", "Fish", 4));
        var ingredientNames = result.days().stream().flatMap(day -> day.meals().stream()).flatMap(meal -> meal.ingredients().stream()).map(Ingredient::name).map(String::toLowerCase).toList();
        assertThat(ingredientNames).noneMatch(name -> name.contains("yoghurt") && !name.contains("soy"));
        assertThat(ingredientNames).noneMatch(name -> name.contains("egg") || name.contains("chicken") || name.contains("tuna") || name.contains("salmon") || name.contains("beef"));
    }

    @Test void structuredDietProfileControlsFallbackIngredients() {
        var profile = new DietaryProfileInput("VEGETARIAN", "", Set.of("NO_EGGS"), Set.of(), Set.of(), Set.of("PEANUTS"), Set.of(), Set.of(), Set.of("OLIVES"), Set.of("INDIAN"), Set.of("TOFU", "LENTILS"), 4, "EASY", "MIN_15_30", "MODERATE");
        var result = service.mealPlan(new MealPlanRequest(2200, 150, 250, 70, "Ignored legacy value", "", "", 4, profile));
        var ingredients = result.days().stream().flatMap(day -> day.meals().stream()).flatMap(meal -> meal.ingredients().stream()).map(Ingredient::name).map(String::toLowerCase).toList();
        assertThat(ingredients).noneMatch(name -> name.contains("egg") || name.contains("chicken") || name.contains("fish") || name.contains("peanut") || name.contains("olive"));
        assertThat(ingredients).anyMatch(name -> name.contains("tofu") || name.contains("lentil"));
        assertThat(result.summary()).contains("filtered for your dietary profile");
    }

    @Test void fallbackCoversPescatarianJainDairyFreeAndCustomExclusions() {
        assertPlanExcludes(profile("PESCATARIAN", Set.of(), Set.of(), Set.of(), Set.of("FISH")), "chicken|beef|pork");
        assertPlanExcludes(profile("OMNIVORE", Set.of(), Set.of("JAIN"), Set.of(), Set.of("LENTILS")), "chicken|beef|fish|egg|onion|garlic|potato|carrot|beetroot");
        assertPlanExcludes(profile("OMNIVORE", Set.of("DAIRY_FREE"), Set.of(), Set.of(), Set.of("TOFU")), "milk|dairy|yoghurt|yogurt|cheese|whey");
        assertPlanExcludes(new DietaryProfileInput("OMNIVORE", "", Set.of(), Set.of("Banana"), Set.of(), Set.of(), Set.of(), Set.of(), Set.of("Olives"), Set.of(), Set.of("LENTILS"), 4, "EASY", "MIN_15_30", "MODERATE"), "banana|olive");
    }

    @Test void fallbackInsightsUsePreferredProteinSources() {
        var profile = profile("VEGETARIAN", Set.of("NO_EGGS"), Set.of(), Set.of(), Set.of("TOFU", "LENTILS"));
        var result = service.insights(new InsightRequest(Map.of("dietaryProfile", profile), List.of(), List.of(), List.of(), List.of()));
        assertThat(result.recommendations().getFirst()).containsIgnoringCase("tofu").containsIgnoringCase("lentils").doesNotContainIgnoringCase("chicken");
    }

    private DietaryProfileInput profile(String pattern, Set<String> restrictions, Set<String> cultural, Set<String> allergies, Set<String> proteins) {
        return new DietaryProfileInput(pattern, "", restrictions, Set.of(), cultural, allergies, Set.of(), Set.of(), Set.of(), Set.of(), proteins, 4, "EASY", "MIN_15_30", "MODERATE");
    }

    private void assertPlanExcludes(DietaryProfileInput profile, String forbiddenPattern) {
        var result = service.mealPlan(new MealPlanRequest(2200, 150, 250, 70, "legacy", "", "", 4, profile));
        assertThat(result.days().stream().flatMap(day -> day.meals().stream()).flatMap(meal -> meal.ingredients().stream()).map(Ingredient::name).map(String::toLowerCase))
            .noneMatch(name -> name.matches(".*(" + forbiddenPattern + ").*"));
    }

    @Test void fallbackInsightsRemainStructuredAndNonMedical() {
        var result = service.insights(new InsightRequest(Map.of("goal", "strength"), List.of(Map.of("name", "Upper")), List.of(), List.of(), List.of()));
        assertThat(result.wins()).isNotEmpty();
        assertThat(result.recommendations()).hasSize(3);
        assertThat(result.disclaimer()).containsIgnoringCase("not medical advice");
    }
}
