package com.pulse.controller;

import com.pulse.entity.*;
import com.pulse.repository.UserRepository;
import com.pulse.repository.*;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.util.Map;
import java.util.LinkedHashMap;
import java.time.*;
import java.nio.charset.StandardCharsets;
import com.pulse.service.NutritionCalculatorService;
import com.pulse.service.NutritionTotalsCalculator;
import com.pulse.service.DietaryProfileService;
import com.pulse.dto.DietaryProfileDtos.DietaryProfileUpdate;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

@RestController @RequestMapping("/api/profile") @RequiredArgsConstructor
public class ProfileController {
    private final UserRepository users;
    private final NutritionCalculatorService calculator;
    private final WorkoutRepository workouts;
    private final MealRepository meals;
    private final WaterLogRepository waterLogs;
    private final SleepLogRepository sleepLogs;
    private final BodyMeasurementRepository measurements;
    private final GoalRepository goals;
    private final DietaryProfileService dietaryProfiles;
    private final NutritionTotalsCalculator nutritionTotals;

    @GetMapping @Transactional(readOnly = true) Map<String, Object> get(Authentication auth) {
        User user = users.findByEmailIgnoreCase(auth.getName()).orElseThrow(); UserProfile p = user.getProfile();
        Map<String, Object> result = new LinkedHashMap<>(); result.put("name", user.getName()); result.put("email", user.getEmail()); result.put("age", p.getAge() == null ? 0 : p.getAge()); result.put("gender", p.getGender() == null ? "" : p.getGender()); result.put("height", p.getHeightCm() == null ? 0 : p.getHeightCm()); result.put("weight", p.getWeightKg() == null ? 0 : p.getWeightKg()); result.put("activityLevel", p.getActivityLevel() == null ? "" : p.getActivityLevel()); result.put("fitnessGoal", p.getFitnessGoal() == null ? "" : p.getFitnessGoal().name()); result.put("dietaryPreferences", p.getDietaryPreferences() == null ? "" : p.getDietaryPreferences()); result.put("dislikedIngredients", p.getDislikedIngredients() == null ? "" : p.getDislikedIngredients()); result.put("dietaryProfile", dietaryProfiles.response(p)); result.put("dietarySummary", dietaryProfiles.summary(p)); result.put("calorieTarget", p.getCalorieTarget()); result.put("proteinTarget", p.getProteinTarget()); result.put("carbTarget", p.getCarbTarget()); result.put("fatTarget", p.getFatTarget()); result.put("hydrationTargetMl", p.getHydrationTargetMl());
        if (p.getAge() != null && p.getHeightCm() != null && p.getWeightKg() != null && p.getGender() != null && p.getActivityLevel() != null && p.getFitnessGoal() != null) result.putAll(calculator.calculate(p.getAge(), p.getGender(), p.getHeightCm(), p.getWeightKg(), p.getActivityLevel(), p.getFitnessGoal()));
        return result;
    }

    @PutMapping @Transactional Map<String, String> update(Authentication auth, @Valid @RequestBody ProfileUpdate body) {
        User user = users.findByEmailIgnoreCase(auth.getName()).orElseThrow(); UserProfile p = user.getProfile();
        if (body.name() != null) { if (body.name().isBlank()) throw new IllegalArgumentException("Name must not be blank"); user.setName(body.name().trim()); }
        if (body.age() != null) p.setAge(body.age()); if (body.height() != null) p.setHeightCm(body.height()); if (body.weight() != null) p.setWeightKg(body.weight());
        if (body.gender() != null) p.setGender(body.gender()); if (body.activityLevel() != null) p.setActivityLevel(body.activityLevel()); if (body.fitnessGoal() != null) p.setFitnessGoal(FitnessGoal.from(body.fitnessGoal()));
        if (body.dietaryPreferences() != null) p.setDietaryPreferences(body.dietaryPreferences().trim());
        if (body.dislikedIngredients() != null) p.setDislikedIngredients(body.dislikedIngredients().trim());
        if (body.dietaryProfile() != null) dietaryProfiles.update(p, body.dietaryProfile());
        if (p.getAge() != null && p.getHeightCm() != null && p.getWeightKg() != null && p.getGender() != null && p.getActivityLevel() != null && p.getFitnessGoal() != null) {
            Map<String, Object> targets = calculator.calculate(p.getAge(), p.getGender(), p.getHeightCm(), p.getWeightKg(), p.getActivityLevel(), p.getFitnessGoal());
            p.setCalorieTarget((Integer) targets.get("recommendedCalories")); p.setProteinTarget((Integer) targets.get("proteinGrams")); p.setCarbTarget((Integer) targets.get("carbohydrateGrams")); p.setFatTarget((Integer) targets.get("fatGrams"));
        }
        return Map.of("message", "Profile updated");
    }

    public record ProfileUpdate(@Size(max = 100) String name,
        @Min(13) @Max(120) Integer age,
        @DecimalMin("80.0") @DecimalMax("250.0") Double height,
        @DecimalMin("25.0") @DecimalMax("500.0") Double weight,
        @Pattern(regexp = "(?i)male|female|non-binary|prefer not to say", message = "must be a supported value") @Size(max = 40) String gender,
        @Pattern(regexp = "(?i)lightly active|moderately active|very active", message = "must be a supported value") @Size(max = 60) String activityLevel,
        @Pattern(regexp = "(?i)lose weight|lose_weight|cut|maintain|build muscle|build_muscle|bulk", message = "must be a supported value") @Size(max = 60) String fitnessGoal,
        @Size(max = 1000) String dietaryPreferences,
        @Size(max = 1000) String dislikedIngredients,
        @Valid DietaryProfileUpdate dietaryProfile) {}

    @GetMapping(value = "/export", produces = "text/csv") @Transactional(readOnly = true) void export(Authentication auth, HttpServletResponse response) throws IOException {
        User user = users.findByEmailIgnoreCase(auth.getName()).orElseThrow(); UserProfile p = user.getProfile();
        response.setCharacterEncoding(StandardCharsets.UTF_8.name()); response.setContentType("text/csv;charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=pulse-data-export.csv"); var writer = response.getWriter();
        writer.println("PROFILE"); writer.println("name,email,age,gender,height_cm,weight_kg,activity_level,fitness_goal,calorie_target,protein_target,carb_target,fat_target,hydration_target_ml");
        writer.printf("%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s%n%n", csv(user.getName()), csv(user.getEmail()), p.getAge(), csv(p.getGender()), p.getHeightCm(), p.getWeightKg(), csv(p.getActivityLevel()), csv(p.getFitnessGoal() == null ? null : p.getFitnessGoal().name()), p.getCalorieTarget(), p.getProteinTarget(), p.getCarbTarget(), p.getFatTarget(), p.getHydrationTargetMl());
        writer.println("DIETARY_PROFILE"); writer.println("pattern,restrictions,cultural_preferences,allergies,intolerances,favourite_foods,disliked_foods,preferred_cuisines,preferred_proteins,meals_per_day,prep_difficulty,prep_time,budget");
        var dietary = dietaryProfiles.response(p); writer.printf("%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s%n%n", csv(dietary.dietaryPattern()), csv(String.join("; ", dietary.restrictions())), csv(String.join("; ", dietary.culturalPreferences())), csv(String.join("; ", dietary.allergies())), csv(String.join("; ", dietary.intolerances())), csv(String.join("; ", dietary.favouriteFoods())), csv(String.join("; ", dietary.dislikedFoods())), csv(String.join("; ", dietary.preferredCuisines())), csv(String.join("; ", dietary.preferredProteinSources())), dietary.preferredMealsPerDay(), csv(dietary.mealPrepDifficulty()), csv(dietary.mealPrepTime()), csv(dietary.budgetPreference()));
        writer.println("WORKOUTS"); writer.println("date,name,duration_minutes,exercise_count,notes"); workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(user.getId(), LocalDateTime.now().minusYears(10), LocalDateTime.now().plusDays(1)).forEach(w -> writer.printf("%s,%s,%s,%s,%s%n", w.getStartedAt(), csv(w.getName()), w.getDurationMinutes(), w.getExercises().size(), csv(w.getNotes())));
        writer.println("\nNUTRITION"); writer.println("date,meal,type,calories,protein_g,carbohydrates_g,fat_g,quality_score"); meals.findByUserIdOrderByEatenAtDesc(user.getId()).forEach(m -> { var t = nutritionTotals.calculate(m); writer.printf("%s,%s,%s,%s,%s,%s,%s,%s%n", m.getEatenAt(), csv(m.getName()), csv(m.getMealType()), Math.round(t.calories()), round1(t.protein()), round1(t.carbohydrates()), round1(t.fat()), m.getQualityScore()); });
        writer.println("\nWATER"); writer.println("date,amount_ml"); waterLogs.findByUserIdAndLoggedAtBetween(user.getId(), LocalDateTime.now().minusYears(10), LocalDateTime.now().plusDays(1)).forEach(w -> writer.printf("%s,%s%n", w.getLoggedAt(), w.getAmountMl()));
        writer.println("\nSLEEP"); writer.println("bedtime,wake_time,duration_minutes,quality,notes"); sleepLogs.findByUserIdOrderByStartedAtDesc(user.getId()).forEach(s -> writer.printf("%s,%s,%s,%s,%s%n", s.getStartedAt(), s.getEndedAt(), Duration.between(s.getStartedAt(), s.getEndedAt()).toMinutes(), s.getQuality(), csv(s.getNotes())));
        writer.println("\nBODY_MEASUREMENTS"); writer.println("date,weight_kg,body_fat,chest_cm,waist_cm,hips_cm,arms_cm,thighs_cm,notes"); measurements.findByUserIdOrderByMeasuredOnDesc(user.getId()).forEach(m -> writer.printf("%s,%s,%s,%s,%s,%s,%s,%s,%s%n", m.getMeasuredOn(), m.getWeightKg(), m.getBodyFatPercentage(), m.getChestCm(), m.getWaistCm(), m.getHipsCm(), m.getArmsCm(), m.getThighsCm(), csv(m.getNotes())));
        writer.println("\nGOALS"); writer.println("type,title,start_value,target_value,unit,start_date,target_date,status,direction,completed_date,created_at"); goals.findByUserIdOrderByCreatedAtDesc(user.getId()).forEach(g -> writer.printf("%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s%n", g.getType(), csv(g.getTitle()), g.getStartValue(), g.getTargetValue(), csv(g.getUnit()), g.getStartDate(), g.getTargetDate(), g.getStatus(), g.getDirection(), g.getCompletedDate(), g.getCreatedAt()));
    }
    private String csv(String value) { return value == null ? "" : "\"" + value.replace("\"", "\"\"") + "\""; }
    private double round1(double value) { return Math.round(value * 10d) / 10d; }
}
