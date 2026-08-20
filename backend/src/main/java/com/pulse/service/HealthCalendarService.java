package com.pulse.service;

import com.pulse.dto.ProgressDtos.*;
import com.pulse.entity.*;
import com.pulse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class HealthCalendarService {
    private final UserRepository users;
    private final WorkoutRepository workouts;
    private final MealRepository meals;
    private final WaterLogRepository waterLogs;
    private final SleepLogRepository sleepLogs;
    private final BodyMeasurementRepository measurements;
    private final StreakService streakService;
    private final NutritionTotalsCalculator nutritionTotals;

    @Transactional(readOnly = true)
    public CalendarMonth get(String email, int year, int month) {
        YearMonth requested = YearMonth.of(year, month);
        LocalDate first = requested.atDay(1);
        LocalDate last = requested.atEndOfMonth();
        LocalDateTime start = first.atStartOfDay();
        LocalDateTime end = last.plusDays(1).atStartOfDay();
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        UserProfile profile = user.getProfile();
        Targets targets = Targets.from(profile);

        Map<LocalDate, MutableDay> indexed = new LinkedHashMap<>();
        for (int day = 1; day <= requested.lengthOfMonth(); day++) indexed.put(requested.atDay(day), new MutableDay());

        meals.findByUserIdAndEatenAtBetween(user.getId(), start, end).forEach(meal -> {
            MutableDay day = indexed.get(meal.getEatenAt().toLocalDate());
            if (day != null) {
                NutritionTotalsCalculator.Totals totals = nutritionTotals.calculate(meal);
                day.meals++;
                day.calories += totals.calories();
                day.protein += totals.protein();
                day.carbohydrates += totals.carbohydrates();
                day.fat += totals.fat();
            }
        });
        waterLogs.findByUserIdAndLoggedAtBetween(user.getId(), start, end).forEach(log -> {
            MutableDay day = indexed.get(log.getLoggedAt().toLocalDate());
            if (day != null) { day.waterEntries++; day.waterMl += log.getAmountMl(); }
        });
        sleepLogs.findByUserIdAndStartedAtBetweenOrderByStartedAt(user.getId(), start.minusDays(1), end).forEach(log -> {
            MutableDay day = indexed.get(log.getEndedAt().toLocalDate());
            if (day != null) {
                day.sleepEntries++;
                day.sleepMinutes += Duration.between(log.getStartedAt(), log.getEndedAt()).toMinutes();
                day.sleepQuality += value(log.getQuality());
            }
        });
        workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(user.getId(), start, end).forEach(workout -> {
            MutableDay day = indexed.get(workout.getStartedAt().toLocalDate());
            if (day != null) day.workouts.add(new ActivityItem(workout.getName(), value(workout.getDurationMinutes())));
        });
        measurements.findByUserIdAndMeasuredOnBetweenOrderByMeasuredOn(user.getId(), first, last).forEach(measurement -> {
            MutableDay day = indexed.get(measurement.getMeasuredOn());
            if (day != null) day.body = new BodyDay(measurement.getWeightKg(), measurement.getBodyFatPercentage(), measurement.getWaistCm());
        });

        List<CalendarDay> days = indexed.entrySet().stream().map(entry -> build(entry.getKey(), entry.getValue(), targets)).toList();
        int onTrack = count(days, DailyStatus.ON_TRACK);
        int partial = count(days, DailyStatus.PARTIAL);
        int offTrack = count(days, DailyStatus.OFF_TRACK);
        int noData = count(days, DailyStatus.NO_DATA);
        return new CalendarMonth(year, month, days,
            new CalendarSummary(onTrack, partial, offTrack, noData, streakService.calculate(email).current()));
    }

    private CalendarDay build(LocalDate date, MutableDay day, Targets targets) {
        NutritionDay nutrition = nutrition(day, targets);
        HydrationDay hydration = hydration(day, targets.hydration());
        SleepDay sleep = sleep(day);
        ActivityDay activity = activity(day);
        List<Integer> applicable = new ArrayList<>();
        if (nutrition.status() != DailyStatus.NO_DATA) applicable.add(nutrition.score());
        if (hydration.status() != DailyStatus.NO_DATA) applicable.add(hydration.score());
        if (sleep.status() != DailyStatus.NO_DATA) applicable.add(sleep.score());
        if (activity.status() != DailyStatus.NO_DATA) applicable.add(activity.score());
        int score = applicable.isEmpty() ? 0 : (int) Math.round(applicable.stream().mapToInt(Integer::intValue).average().orElse(0));
        DailyStatus status = applicable.isEmpty() ? DailyStatus.NO_DATA : score >= 80 ? DailyStatus.ON_TRACK : score >= 50 ? DailyStatus.PARTIAL : DailyStatus.OFF_TRACK;
        List<String> wins = new ArrayList<>();
        List<String> attention = new ArrayList<>();
        explain(nutrition.status(), "Nutrition targets were well balanced", "Nutrition was outside the target range", wins, attention);
        explain(hydration.status(), "Hydration target reached", "Hydration was below target", wins, attention);
        explain(sleep.status(), "Sleep duration and quality supported recovery", "Sleep duration or quality was below target", wins, attention);
        if (activity.status() == DailyStatus.ON_TRACK) wins.add(activity.workouts() == 1 ? "Workout completed" : activity.workouts() + " workouts completed");
        return new CalendarDay(date, score, status, nutrition, hydration, sleep, activity, day.body, wins, attention);
    }

    private NutritionDay nutrition(MutableDay day, Targets targets) {
        if (day.meals == 0) return new NutritionDay(DailyStatus.NO_DATA, 0, 0, targets.calories(), 0, targets.protein(), 0, targets.carbohydrates(), 0, targets.fat());
        int score = (boundedScore(day.calories, targets.calories()) + proteinScore(day.protein, targets.protein())
            + boundedScore(day.carbohydrates, targets.carbohydrates()) + boundedScore(day.fat, targets.fat())) / 4;
        return new NutritionDay(score >= 85 ? DailyStatus.ON_TRACK : score >= 55 ? DailyStatus.PARTIAL : DailyStatus.OFF_TRACK,
            score, round(day.calories), targets.calories(), round(day.protein), targets.protein(),
            round(day.carbohydrates), targets.carbohydrates(), round(day.fat), targets.fat());
    }

    private HydrationDay hydration(MutableDay day, int target) {
        if (day.waterEntries == 0) return new HydrationDay(DailyStatus.NO_DATA, 0, 0, target);
        double ratio = day.waterMl / (double) target;
        int score = ratio >= .9 ? 100 : ratio >= .6 ? 65 : 30;
        return new HydrationDay(ratio >= .9 ? DailyStatus.ON_TRACK : ratio >= .6 ? DailyStatus.PARTIAL : DailyStatus.OFF_TRACK, score, day.waterMl, target);
    }

    private SleepDay sleep(MutableDay day) {
        if (day.sleepEntries == 0) return new SleepDay(DailyStatus.NO_DATA, 0, 0, 0, 0);
        double hours = day.sleepMinutes / 60d;
        double quality = day.sleepQuality / (double) day.sleepEntries;
        DailyStatus status = hours >= 7 && hours <= 9 && quality >= 4 ? DailyStatus.ON_TRACK
            : hours >= 6 && hours <= 10 && quality >= 3 ? DailyStatus.PARTIAL : DailyStatus.OFF_TRACK;
        return new SleepDay(status, status == DailyStatus.ON_TRACK ? 100 : status == DailyStatus.PARTIAL ? 65 : 30,
            day.sleepMinutes, round(hours), round(quality));
    }

    private ActivityDay activity(MutableDay day) {
        if (day.workouts.isEmpty()) return new ActivityDay(DailyStatus.NO_DATA, 0, 0, List.of());
        return new ActivityDay(DailyStatus.ON_TRACK, 100, day.workouts.size(), List.copyOf(day.workouts));
    }

    private int boundedScore(double actual, int target) {
        double ratio = actual / target;
        return ratio >= .9 && ratio <= 1.1 ? 100 : ratio >= .75 && ratio <= 1.25 ? 65 : 30;
    }
    private int proteinScore(double actual, int target) { double ratio = actual / target; return ratio >= .9 ? 100 : ratio >= .6 ? 65 : 30; }
    private void explain(DailyStatus status, String win, String concern, List<String> wins, List<String> attention) {
        if (status == DailyStatus.ON_TRACK) wins.add(win);
        else if (status == DailyStatus.PARTIAL || status == DailyStatus.OFF_TRACK) attention.add(concern);
    }
    private int count(List<CalendarDay> days, DailyStatus status) { return (int) days.stream().filter(day -> day.status() == status).count(); }
    private int value(Integer value) { return value == null ? 0 : value; }
    private double round(double value) { return Math.round(value * 10d) / 10d; }

    private static class MutableDay {
        int meals;
        double calories;
        double protein;
        double carbohydrates;
        double fat;
        int waterEntries;
        int waterMl;
        int sleepEntries;
        long sleepMinutes;
        int sleepQuality;
        List<ActivityItem> workouts = new ArrayList<>();
        BodyDay body;
    }

    private record Targets(int calories, int protein, int carbohydrates, int fat, int hydration) {
        static Targets from(UserProfile profile) {
            return new Targets(value(profile == null ? null : profile.getCalorieTarget(), 2200),
                value(profile == null ? null : profile.getProteinTarget(), 150),
                value(profile == null ? null : profile.getCarbTarget(), 250),
                value(profile == null ? null : profile.getFatTarget(), 70),
                value(profile == null ? null : profile.getHydrationTargetMl(), 2500));
        }
        private static int value(Integer value, int fallback) { return value == null || value <= 0 ? fallback : value; }
    }
}
