package com.pulse.service;

import com.pulse.dto.ProgressDtos.*;
import com.pulse.entity.*;
import com.pulse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class ProgressService {
    private final UserRepository users;
    private final WorkoutRepository workouts;
    private final MealRepository meals;
    private final WaterLogRepository waterLogs;
    private final SleepLogRepository sleepLogs;
    private final BodyMeasurementRepository measurements;
    private final StreakService streakService;
    private final NutritionTotalsCalculator nutritionTotals;

    @Transactional(readOnly = true)
    public ProgressSummary get(String email, String range) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        int days = "month".equalsIgnoreCase(range) ? 30 : 7;
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(days - 1L);
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.plusDays(1).atStartOfDay();
        List<Workout> workoutData = workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(user.getId(), start, end);
        List<Meal> mealData = meals.findByUserIdAndEatenAtBetween(user.getId(), start, end);
        List<WaterLog> waterData = waterLogs.findByUserIdAndLoggedAtBetween(user.getId(), start, end);
        List<SleepLog> sleepData = sleepLogs.findByUserIdAndStartedAtBetweenOrderByStartedAt(user.getId(), start.minusDays(1), end);
        List<BodyMeasurement> bodyData = measurements.findByUserIdAndMeasuredOnBetweenOrderByMeasuredOn(user.getId(), from, to);
        List<BodyMeasurement> allBody = measurements.findByUserIdOrderByMeasuredOnDesc(user.getId());
        UserProfile profile = user.getProfile();

        double volume = workoutData.stream().flatMap(workout -> workout.getExercises().stream()).mapToDouble(item -> value(item.getSets()) * value(item.getReps()) * value(item.getWeightKg())).sum();
        int duration = workoutData.stream().mapToInt(item -> value(item.getDurationMinutes())).sum();
        Map<LocalDate, DailyTotals> daily = new LinkedHashMap<>();
        for (int i = 0; i < days; i++) daily.put(from.plusDays(i), new DailyTotals());
        workoutData.forEach(workout -> { DailyTotals d = daily.get(workout.getStartedAt().toLocalDate()); if (d != null) { d.workouts++; d.duration += value(workout.getDurationMinutes()); d.volume += workout.getExercises().stream().mapToDouble(item -> value(item.getSets()) * value(item.getReps()) * value(item.getWeightKg())).sum(); }});
        mealData.forEach(meal -> { DailyTotals d = daily.get(meal.getEatenAt().toLocalDate()); if (d != null) { d.meals++; addMeal(d, meal); }});
        waterData.forEach(log -> { DailyTotals d = daily.get(log.getLoggedAt().toLocalDate()); if (d != null) { d.waterEntries++; d.water += log.getAmountMl(); }});
        sleepData.forEach(log -> { DailyTotals d = daily.get(log.getEndedAt().toLocalDate()); if (d != null) { d.sleepMinutes += Duration.between(log.getStartedAt(), log.getEndedAt()).toMinutes(); d.sleepQuality += log.getQuality(); d.sleepCount++; }});
        bodyData.forEach(body -> { DailyTotals d = daily.get(body.getMeasuredOn()); if (d != null && body.getWeightKg() != null) d.weight = body.getWeightKg(); });

        double avgCalories = daily.values().stream().filter(value -> value.meals > 0).mapToDouble(value -> value.calories).average().orElse(0);
        double avgProtein = daily.values().stream().filter(value -> value.meals > 0).mapToDouble(value -> value.protein).average().orElse(0);
        int calorieTarget = profile == null || profile.getCalorieTarget() == null ? 2200 : profile.getCalorieTarget();
        int proteinTarget = profile == null || profile.getProteinTarget() == null ? 150 : profile.getProteinTarget();
        int hydrationTarget = profile == null || profile.getHydrationTargetMl() == null ? 2500 : profile.getHydrationTargetMl();
        int calorieDays = (int) daily.values().stream().filter(value -> value.calories >= calorieTarget * .9 && value.calories <= calorieTarget * 1.1).count();
        int proteinDays = (int) daily.values().stream().filter(value -> value.protein >= proteinTarget).count();
        double avgWater = daily.values().stream().filter(value -> value.waterEntries > 0).mapToInt(value -> value.water).average().orElse(0);
        long sleepCount = daily.values().stream().filter(value -> value.sleepCount > 0).count();
        double avgSleep = sleepCount == 0 ? 0 : daily.values().stream().mapToLong(value -> value.sleepMinutes).sum() / (double) sleepCount;
        double avgQuality = sleepCount == 0 ? 0 : daily.values().stream().mapToDouble(value -> value.sleepCount == 0 ? 0 : value.sleepQuality / (double) value.sleepCount).sum() / sleepCount;
        Double latestWeight = allBody.stream().map(BodyMeasurement::getWeightKg).filter(Objects::nonNull).findFirst().orElse(null);
        Double earliestWeight = bodyData.stream().map(BodyMeasurement::getWeightKg).filter(Objects::nonNull).findFirst().orElse(null);
        Double latestRangeWeight = bodyData.stream().map(BodyMeasurement::getWeightKg).filter(Objects::nonNull).reduce((a, b) -> b).orElse(null);
        Double latestFat = allBody.stream().map(BodyMeasurement::getBodyFatPercentage).filter(Objects::nonNull).findFirst().orElse(null);
        Double earliestFat = bodyData.stream().map(BodyMeasurement::getBodyFatPercentage).filter(Objects::nonNull).findFirst().orElse(null);
        Double latestRangeFat = bodyData.stream().map(BodyMeasurement::getBodyFatPercentage).filter(Objects::nonNull).reduce((a, b) -> b).orElse(null);
        List<ProgressPoint> timeline = daily.entrySet().stream().map(entry -> { DailyTotals d = entry.getValue(); return new ProgressPoint(entry.getKey(), d.workouts, d.duration, round(d.volume), round(d.calories), round(d.protein), d.water, round(d.sleepMinutes / 60d), d.weight); }).toList();
        return new ProgressSummary(days == 30 ? "month" : "week", from, to,
            new WorkoutAnalytics(workoutData.size(), duration, round(volume), round(workoutData.size() / (days / 7d))),
            new NutritionAnalytics(round(avgCalories), round(avgProtein), calorieDays, proteinDays),
            new HydrationAnalytics(round(avgWater), round(avgWater / hydrationTarget * 100)),
            new SleepAnalytics(round(avgSleep), round(avgQuality)),
            new BodyAnalytics(latestWeight, difference(latestRangeWeight, earliestWeight), latestFat, difference(latestRangeFat, earliestFat)),
            streakService.calculate(email), timeline);
    }

    @Transactional(readOnly = true)
    public ComparisonSummary compare(String email) {
        ProgressSummary month = get(email, "month");
        LocalDate today = LocalDate.now();
        List<ProgressPoint> current = month.timeline().stream().filter(point -> !point.date().isBefore(today.minusDays(6))).toList();
        List<ProgressPoint> previous = month.timeline().stream().filter(point -> !point.date().isBefore(today.minusDays(13)) && point.date().isBefore(today.minusDays(6))).toList();
        List<ComparisonMetric> metrics = List.of(
            comparison("workouts", "Workouts", sum(current, "workouts"), sum(previous, "workouts"), "sessions"),
            comparison("volume", "Training volume", sum(current, "volume"), sum(previous, "volume"), "kg"),
            comparison("protein", "Protein average", averageRecorded(current, "protein"), averageRecorded(previous, "protein"), "g"),
            comparison("calories", "Calories average", averageRecorded(current, "calories"), averageRecorded(previous, "calories"), "kcal"),
            comparison("water", "Water average", averageRecorded(current, "water"), averageRecorded(previous, "water"), "ml"),
            comparison("sleep", "Sleep average", averageRecorded(current, "sleep"), averageRecorded(previous, "sleep"), "hours")
        );
        return new ComparisonSummary("This week vs last week", metrics);
    }

    @Transactional(readOnly = true)
    public RecoverySummary recovery(String email) {
        ProgressSummary week = get(email, "week");
        int sleep = (int) Math.round(Math.min(100, week.sleep().averageMinutes() / 480d * 100));
        int hydration = (int) Math.round(Math.min(100, week.hydration().goalPercentage()));
        int workoutCount = week.workouts().count();
        int load = workoutCount == 0 ? 65 : workoutCount <= 5 ? 88 : Math.max(45, 100 - (workoutCount - 5) * 12);
        int score = (int) Math.round(sleep * .45 + hydration * .35 + load * .20);
        String rating = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Moderate" : "Needs attention";
        return new RecoverySummary(score, rating, sleep, hydration, load, "General wellness guidance based on logged sleep, hydration and training load; not a medical assessment.");
    }

    private ComparisonMetric comparison(String key, String label, double current, double previous, String unit) {
        Double previousValue = previous == 0 ? null : round(previous);
        Double change = previous == 0 ? null : round((current - previous) / previous * 100d);
        return new ComparisonMetric(key, label, round(current), previousValue, change, unit);
    }
    private double sum(List<ProgressPoint> points, String key) { return points.stream().mapToDouble(point -> switch (key) { case "workouts" -> point.workouts(); case "volume" -> point.volumeKg(); default -> 0; }).sum(); }
    private double averageRecorded(List<ProgressPoint> points, String key) { return points.stream().mapToDouble(point -> switch (key) { case "protein" -> point.protein(); case "calories" -> point.calories(); case "water" -> point.waterMl(); case "sleep" -> point.sleepHours(); default -> 0; }).filter(value -> value > 0).average().orElse(0); }

    private void addMeal(DailyTotals d, Meal meal) { NutritionTotalsCalculator.Totals totals = nutritionTotals.calculate(meal); d.calories += totals.calories(); d.protein += totals.protein(); }
    private Double difference(Double latest, Double earliest) { return latest == null || earliest == null ? null : round(latest - earliest); }
    private double round(double value) { return Math.round(value * 10d) / 10d; }
    private int value(Integer value) { return value == null ? 0 : value; }
    private double value(Double value) { return value == null ? 0 : value; }
    private static class DailyTotals { int workouts; int duration; double volume; double calories; double protein; int meals; int water; int waterEntries; long sleepMinutes; int sleepQuality; int sleepCount; Double weight; }
}
