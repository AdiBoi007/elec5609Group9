package com.pulse.service;

import com.pulse.dto.TodayDtos.*;
import com.pulse.entity.*;
import com.pulse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TodayService {
    private final UserRepository users;
    private final MealRepository meals;
    private final WaterLogRepository waterLogs;
    private final WorkoutRepository workouts;
    private final SleepLogRepository sleepLogs;
    private final BodyMeasurementRepository measurements;
    private final NutritionTotalsCalculator nutritionTotals;

    @Transactional(readOnly = true)
    public TodaySummary get(String email) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = start.plusDays(1);
        List<TimelineItem> timeline = new ArrayList<>();

        meals.findByUserIdAndEatenAtBetween(user.getId(), start, end).forEach(meal -> {
            NutritionTotalsCalculator.Totals totals = nutritionTotals.calculate(meal);
            timeline.add(new TimelineItem(meal.getId(), "MEAL", meal.getEatenAt().toLocalTime(),
                meal.getName(), Math.round(totals.calories()) + " kcal · " + Math.round(totals.protein()) + "g protein", "/nutrition"));
        });
        waterLogs.findByUserIdAndLoggedAtBetween(user.getId(), start, end).forEach(log ->
            timeline.add(new TimelineItem(log.getId(), "WATER", log.getLoggedAt().toLocalTime(),
                "Water", "+" + log.getAmountMl() + " ml", "/water")));
        workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(user.getId(), start, end).forEach(workout ->
            timeline.add(new TimelineItem(workout.getId(), "WORKOUT", workout.getStartedAt().toLocalTime(),
                workout.getName(), value(workout.getDurationMinutes()) + " min · " + workout.getExercises().size() + " exercises", "/workouts/" + workout.getId())));
        sleepLogs.findByUserIdAndStartedAtBetweenOrderByStartedAt(user.getId(), start.minusDays(1), end).stream()
            .filter(log -> log.getEndedAt() != null && log.getEndedAt().toLocalDate().equals(today))
            .forEach(log -> timeline.add(new TimelineItem(log.getId(), "SLEEP", log.getEndedAt().toLocalTime(),
                "Sleep", duration(log) + " · quality " + value(log.getQuality()) + "/5", "/sleep")));
        measurements.findByUserIdAndMeasuredOnBetweenOrderByMeasuredOn(user.getId(), today, today).forEach(item -> {
            String detail = item.getWeightKg() == null ? "Body measurements recorded" : String.format(Locale.ROOT, "%.1f kg", item.getWeightKg());
            timeline.add(new TimelineItem(item.getId(), "BODY", null, "Body measurement", detail, "/body"));
        });
        timeline.sort(Comparator.comparing(TimelineItem::time, Comparator.nullsLast(Comparator.naturalOrder())));
        return new TodaySummary(List.copyOf(timeline), highlights(user, today));
    }

    private List<Highlight> highlights(User user, LocalDate today) {
        List<Highlight> result = new ArrayList<>();
        LocalDateTime weekStart = today.minusDays(6).atStartOfDay();
        LocalDateTime tomorrow = today.plusDays(1).atStartOfDay();
        int proteinTarget = profileValue(user, "protein", 150);
        Map<LocalDate, Double> proteinByDay = new HashMap<>();
        meals.findByUserIdAndEatenAtBetween(user.getId(), weekStart, tomorrow).forEach(meal ->
            proteinByDay.merge(meal.getEatenAt().toLocalDate(), nutritionTotals.calculate(meal).protein(), Double::sum));
        long proteinDays = proteinByDay.values().stream().filter(value -> value >= proteinTarget * .9).count();
        if (proteinByDay.size() >= 3) {
            result.add(new Highlight("PROTEIN", proteinDays >= 4 ? "Protein consistency is strong" : "Protein has room to improve",
                proteinDays + " of " + proteinByDay.size() + " logged days reached at least 90% of target.", proteinDays >= 4 ? "SUCCESS" : "WARNING"));
        }

        List<BodyMeasurement> body = measurements.findByUserIdAndMeasuredOnBetweenOrderByMeasuredOn(user.getId(), today.minusDays(30), today);
        List<BodyMeasurement> weights = body.stream().filter(item -> item.getWeightKg() != null).toList();
        if (weights.size() >= 2) {
            BodyMeasurement first = weights.getFirst();
            BodyMeasurement last = weights.getLast();
            double change = Math.round((last.getWeightKg() - first.getWeightKg()) * 10d) / 10d;
            result.add(new Highlight("WEIGHT", change < 0 ? "Weight is trending down" : change > 0 ? "Weight is trending up" : "Weight is stable",
                String.format(Locale.ROOT, "%.1f → %.1f kg across %d days.", first.getWeightKg(), last.getWeightKg(), Duration.between(first.getMeasuredOn().atStartOfDay(), last.getMeasuredOn().atStartOfDay()).toDays()), "NEUTRAL"));
        }

        LocalDate monthStart = today.minusDays(29);
        Map<LocalDate, Integer> waterByDay = new HashMap<>();
        waterLogs.findByUserIdAndLoggedAtBetween(user.getId(), monthStart.atStartOfDay(), tomorrow).forEach(log ->
            waterByDay.merge(log.getLoggedAt().toLocalDate(), log.getAmountMl(), Integer::sum));
        Set<LocalDate> workoutDays = new HashSet<>();
        workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(user.getId(), monthStart.atStartOfDay(), tomorrow)
            .forEach(workout -> workoutDays.add(workout.getStartedAt().toLocalDate()));
        List<Integer> trainingWater = waterByDay.entrySet().stream().filter(entry -> workoutDays.contains(entry.getKey())).map(Map.Entry::getValue).toList();
        List<Integer> restWater = waterByDay.entrySet().stream().filter(entry -> !workoutDays.contains(entry.getKey())).map(Map.Entry::getValue).toList();
        if (trainingWater.size() >= 2 && restWater.size() >= 2) {
            int trainingAverage = average(trainingWater);
            int restAverage = average(restWater);
            if (Math.abs(trainingAverage - restAverage) >= 250) {
                result.add(new Highlight("HYDRATION", trainingAverage > restAverage ? "Hydration rises on training days" : "Hydration drops on training days",
                    String.format(Locale.ROOT, "Training days average %.1f L versus %.1f L on logged rest days.", trainingAverage / 1000d, restAverage / 1000d), trainingAverage > restAverage ? "SUCCESS" : "WARNING"));
            }
        }
        if (result.isEmpty()) result.add(new Highlight("CONSISTENCY", "Keep building the signal", "Log across several days to unlock evidence-based health highlights.", "NEUTRAL"));
        return result.stream().limit(3).toList();
    }

    private int average(List<Integer> values) { return (int) Math.round(values.stream().mapToInt(Integer::intValue).average().orElse(0)); }
    private int value(Integer number) { return number == null ? 0 : number; }
    private int profileValue(User user, String type, int fallback) {
        if (user.getProfile() == null) return fallback;
        Integer value = "protein".equals(type) ? user.getProfile().getProteinTarget() : null;
        return value == null || value <= 0 ? fallback : value;
    }
    private String duration(SleepLog log) {
        long minutes = Duration.between(log.getStartedAt(), log.getEndedAt()).toMinutes();
        return minutes / 60 + "h " + minutes % 60 + "m";
    }
}
