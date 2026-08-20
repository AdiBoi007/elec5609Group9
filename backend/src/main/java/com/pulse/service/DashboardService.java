package com.pulse.service;

import com.pulse.dto.DashboardSummary;
import com.pulse.entity.*;
import com.pulse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;

@Service @RequiredArgsConstructor
public class DashboardService {
    private final UserRepository users;
    private final WaterLogRepository waterLogs;
    private final BodyMeasurementRepository measurements;
    private final MealService mealService;
    private final StreakService streakService;

    @Transactional(readOnly = true)
    public DashboardSummary get(String email) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        UserProfile profile = user.getProfile();
        LocalDateTime start = LocalDate.now().atStartOfDay();
        int water = waterLogs.findByUserIdAndLoggedAtBetween(user.getId(), start, start.plusDays(1)).stream().mapToInt(WaterLog::getAmountMl).sum();
        double weight = measurements.findFirstByUserIdOrderByMeasuredOnDesc(user.getId()).map(BodyMeasurement::getWeightKg).orElse(profile != null && profile.getWeightKg() != null ? profile.getWeightKg() : 0);
        var meals = mealService.today(email);
        int calories = meals.stream().mapToInt(item -> (int) item.calories()).sum();
        int protein = meals.stream().mapToInt(item -> (int) item.protein()).sum();
        int carbs = meals.stream().mapToInt(item -> (int) item.carbohydrates()).sum();
        int fat = meals.stream().mapToInt(item -> (int) item.fat()).sum();
        int streak = streakService.calculate(email).current();
        return new DashboardSummary(calories, value(profile == null ? null : profile.getCalorieTarget(), 2200), protein, value(profile == null ? null : profile.getProteinTarget(), 150), carbs, value(profile == null ? null : profile.getCarbTarget(), 250), fat, value(profile == null ? null : profile.getFatTarget(), 70), water, value(profile == null ? null : profile.getHydrationTargetMl(), 2500), weight, streak);
    }
    private int value(Integer value, int fallback) { return value == null ? fallback : value; }
}
