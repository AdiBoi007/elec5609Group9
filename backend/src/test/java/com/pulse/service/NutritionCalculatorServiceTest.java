package com.pulse.service;

import com.pulse.entity.FitnessGoal;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;

class NutritionCalculatorServiceTest {
    private final NutritionCalculatorService service = new NutritionCalculatorService();

    @Test
    void calculatesConsistentTargets() {
        Map<String, Object> result = service.calculate(24, "male", 178, 72.4, "active", FitnessGoal.BULK);
        assertThat((Integer) result.get("bmr")).isPositive();
        assertThat((Integer) result.get("tdee")).isGreaterThan((Integer) result.get("bmr"));
        assertThat((Integer) result.get("recommendedCalories")).isGreaterThan((Integer) result.get("tdee"));
        assertThat((Integer) result.get("proteinGrams")).isBetween(140, 150);
    }

    @Test
    void appliesGoalCalorieAdjustmentRelativeToTdee() {
        int tdee = (Integer) service.calculate(30, "female", 165, 60, "moderately active", FitnessGoal.MAINTAIN).get("tdee");
        assertThat(service.calculate(30, "female", 165, 60, "moderately active", FitnessGoal.MAINTAIN).get("recommendedCalories")).isEqualTo(tdee);
        assertThat(service.calculate(30, "female", 165, 60, "moderately active", FitnessGoal.BULK).get("recommendedCalories")).isEqualTo(tdee + 250);
        assertThat(service.calculate(30, "female", 165, 60, "moderately active", FitnessGoal.CUT).get("recommendedCalories")).isEqualTo(tdee - 400);
    }

    @Test
    void nullGoalLeavesCaloriesAtTdee() {
        Map<String, Object> result = service.calculate(40, "non-binary", 170, 70, "lightly active", null);
        assertThat(result.get("recommendedCalories")).isEqualTo(result.get("tdee"));
    }
}
