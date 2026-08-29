package com.pulse.service;

import com.pulse.entity.FitnessGoal;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class NutritionCalculatorService {
    public Map<String, Object> calculate(int age, String gender, double heightCm, double weightKg, String activityLevel, FitnessGoal goal) {
        double sexOffset = "female".equalsIgnoreCase(gender) ? -161 : "male".equalsIgnoreCase(gender) ? 5 : -78;
        int bmr = (int) Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset);
        String activity = activityLevel.toLowerCase().replace(' ', '_');
        double factor = switch (activity) { case "light", "lightly_active" -> 1.375; case "very_active" -> 1.725; case "active", "moderately_active" -> 1.55; default -> 1.2; };
        int tdee = (int) Math.round(bmr * factor);
        int calories = tdee + (goal == null ? 0 : goal.calorieAdjustment);
        int protein = (int) Math.round(weightKg * 2.0);
        int fat = (int) Math.round(weightKg * 0.8);
        int carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
        double bmi = Math.round(weightKg / Math.pow(heightCm / 100d, 2) * 10d) / 10d;
        return Map.of("bmi", bmi, "bmr", bmr, "tdee", tdee, "recommendedCalories", calories, "proteinGrams", protein, "carbohydrateGrams", carbs, "fatGrams", fat);
    }
}
