package com.pulse.service;

import com.pulse.dto.AiDtos.*;
import com.pulse.entity.*;
import com.pulse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class InsightService {
    private final UserRepository users;
    private final WorkoutRepository workouts;
    private final MealRepository meals;
    private final WaterLogRepository waterLogs;
    private final SleepLogRepository sleepLogs;
    private final BodyMeasurementRepository measurements;
    private final AiService ai;
    private final DietaryProfileService dietaryProfiles;

    @Transactional(readOnly = true)
    public InsightResponse insights(String email) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        LocalDateTime from = LocalDate.now().minusDays(13).atStartOfDay();
        LocalDateTime to = LocalDate.now().plusDays(1).atStartOfDay();
        UserProfile p = user.getProfile();
        Map<String, Object> profile = new LinkedHashMap<>();
        if (p != null) { profile.put("age", p.getAge()); profile.put("fitnessGoal", p.getFitnessGoal()); profile.put("activityLevel", p.getActivityLevel()); profile.put("calorieTarget", p.getCalorieTarget()); profile.put("proteinTarget", p.getProteinTarget()); profile.put("hydrationTargetMl", p.getHydrationTargetMl()); profile.put("dietaryProfile", dietaryProfiles.input(p)); }
        List<Map<String, Object>> workoutData = workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(user.getId(), from, to).stream().map(w -> map("date", w.getStartedAt().toLocalDate(), "name", w.getName(), "durationMinutes", w.getDurationMinutes(), "exerciseCount", w.getExercises().size())).toList();
        List<Map<String, Object>> nutrition = new ArrayList<>(meals.findByUserIdAndEatenAtBetween(user.getId(), from, to).stream().map(m -> map("date", m.getEatenAt().toLocalDate(), "meal", m.getName(), "qualityScore", m.getQualityScore())).toList());
        Map<LocalDate, Integer> hydration = new TreeMap<>(); waterLogs.findByUserIdAndLoggedAtBetween(user.getId(), from, to).forEach(w -> hydration.merge(w.getLoggedAt().toLocalDate(), w.getAmountMl(), Integer::sum));
        hydration.forEach((date, amount) -> nutrition.add(map("date", date, "waterMl", amount)));
        List<Map<String, Object>> sleep = sleepLogs.findByUserIdAndStartedAtBetweenOrderByStartedAt(user.getId(), from.minusDays(1), to).stream().map(s -> map("date", s.getEndedAt().toLocalDate(), "minutes", Duration.between(s.getStartedAt(), s.getEndedAt()).toMinutes(), "quality", s.getQuality())).toList();
        List<Map<String, Object>> body = measurements.findByUserIdAndMeasuredOnBetweenOrderByMeasuredOn(user.getId(), from.toLocalDate(), to.toLocalDate()).stream().map(m -> map("date", m.getMeasuredOn(), "weightKg", m.getWeightKg(), "bodyFatPercentage", m.getBodyFatPercentage(), "waistCm", m.getWaistCm())).toList();
        return ai.insights(new InsightRequest(profile, workoutData, nutrition, sleep, body));
    }
    private Map<String, Object> map(Object... values) { Map<String, Object> result = new LinkedHashMap<>(); for (int i = 0; i < values.length; i += 2) if (values[i + 1] != null) result.put(values[i].toString(), values[i + 1]); return result; }
}
