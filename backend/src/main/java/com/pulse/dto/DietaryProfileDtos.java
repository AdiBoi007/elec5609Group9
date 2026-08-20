package com.pulse.dto;

import jakarta.validation.constraints.*;
import java.util.Set;

public final class DietaryProfileDtos {
    private DietaryProfileDtos() {}

    public record DietaryProfileUpdate(
        @NotBlank @Pattern(regexp = "OMNIVORE|VEGETARIAN|VEGAN|PESCATARIAN|EGGETARIAN|FLEXITARIAN|CUSTOM") String dietaryPattern,
        @Size(max = 200) String customDietaryPattern,
        @Size(max = 20) Set<@Size(max = 80) String> restrictions,
        @Size(max = 20) Set<@Size(max = 100) String> customExclusions,
        @Size(max = 10) Set<@Size(max = 80) String> culturalPreferences,
        @Size(max = 10) Set<@Size(max = 100) String> customCulturalPreferences,
        @Size(max = 20) Set<@Size(max = 80) String> allergies,
        @Size(max = 20) Set<@Size(max = 100) String> customAllergies,
        @Size(max = 20) Set<@Size(max = 80) String> intolerances,
        @Size(max = 20) Set<@Size(max = 100) String> customIntolerances,
        @Size(max = 30) Set<@Size(max = 100) String> favouriteFoods,
        @Size(max = 30) Set<@Size(max = 100) String> dislikedFoods,
        @Size(max = 20) Set<@Size(max = 80) String> preferredCuisines,
        @Size(max = 20) Set<@Size(max = 80) String> preferredProteinSources,
        @Size(max = 20) Set<@Size(max = 100) String> customProteinSources,
        @Min(2) @Max(6) Integer preferredMealsPerDay,
        @Pattern(regexp = "VERY_EASY|EASY|MODERATE") String mealPrepDifficulty,
        @Pattern(regexp = "UNDER_15|MIN_15_30|MIN_30_60") String mealPrepTime,
        @Pattern(regexp = "BUDGET|MODERATE|FLEXIBLE") String budgetPreference) {}

    public record DietaryProfileResponse(
        String dietaryPattern, String customDietaryPattern, Set<String> restrictions,
        Set<String> customExclusions, Set<String> culturalPreferences, Set<String> customCulturalPreferences,
        Set<String> allergies, Set<String> customAllergies, Set<String> intolerances,
        Set<String> customIntolerances, Set<String> favouriteFoods, Set<String> dislikedFoods,
        Set<String> preferredCuisines, Set<String> preferredProteinSources, Set<String> customProteinSources,
        Integer preferredMealsPerDay, String mealPrepDifficulty, String mealPrepTime, String budgetPreference) {}

    public record DietaryProfileInput(
        String dietaryPattern, String customDietaryPattern, Set<String> restrictions,
        Set<String> customExclusions, Set<String> culturalPreferences, Set<String> allergies,
        Set<String> intolerances, Set<String> favouriteFoods, Set<String> dislikedFoods,
        Set<String> preferredCuisines, Set<String> preferredProteinSources,
        Integer preferredMealsPerDay, String mealPrepDifficulty, String mealPrepTime, String budgetPreference) {}

    public record DietCompatibility(String status, boolean metadataAvailable, java.util.List<String> warnings) {}
}
