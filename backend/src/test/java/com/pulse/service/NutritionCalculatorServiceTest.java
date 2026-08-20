package com.pulse.service;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThat;

class NutritionCalculatorServiceTest {
    private final NutritionCalculatorService service = new NutritionCalculatorService();

    @Test
    void calculatesConsistentTargets() {
        Map<String, Object> result = service.calculate(24, "male", 178, 72.4, "active", "build_muscle");
        assertThat((Integer) result.get("bmr")).isPositive();
        assertThat((Integer) result.get("tdee")).isGreaterThan((Integer) result.get("bmr"));
        assertThat((Integer) result.get("recommendedCalories")).isGreaterThan((Integer) result.get("tdee"));
        assertThat((Integer) result.get("proteinGrams")).isBetween(140, 150);
    }
}
