package com.pulse.service;

import com.pulse.dto.GoalDtos.*;
import com.pulse.entity.*;
import com.pulse.entity.Goal.*;
import com.pulse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service @RequiredArgsConstructor
public class GoalService {
    private final GoalRepository goals;
    private final UserRepository users;
    private final BodyMeasurementRepository measurements;
    private final MealRepository meals;
    private final WaterLogRepository waterLogs;
    private final SleepLogRepository sleepLogs;
    private final WorkoutRepository workouts;
    private final StreakService streaks;
    private final NutritionTotalsCalculator nutritionTotals;

    @Transactional
    public List<GoalResponse> list(String email) {
        User user = user(email);
        return goals.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(goal -> response(goal, email, true)).toList();
    }

    @Transactional
    public GoalResponse get(String email, Long id) {
        Goal goal = owned(email, id);
        return response(goal, email, true);
    }

    @Transactional
    public GoalResponse create(String email, GoalRequest request) {
        validateDates(request.startDate(), request.targetDate());
        User user = user(email);
        Metric metric = metric(user, request.type(), request.startDate());
        Goal goal = new Goal();
        goal.setUser(user);
        goal.setType(request.type());
        goal.setTitle(request.title().trim());
        goal.setStartValue(metric.current());
        goal.setTargetValue(request.targetValue());
        goal.setUnit(request.unit() == null || request.unit().isBlank() ? defaultUnit(request.type()) : request.unit().trim());
        goal.setStartDate(request.startDate());
        goal.setTargetDate(request.targetDate());
        goal.setDirection(request.direction() == null ? defaultDirection(request.type(), metric.current(), request.targetValue()) : request.direction());
        goal.setStatus(Status.ACTIVE);
        return response(goals.save(goal), email, true);
    }

    @Transactional
    public GoalResponse update(String email, Long id, GoalRequest request) {
        validateDates(request.startDate(), request.targetDate());
        Goal goal = owned(email, id);
        goal.setType(request.type());
        goal.setTitle(request.title().trim());
        goal.setTargetValue(request.targetValue());
        goal.setUnit(request.unit() == null || request.unit().isBlank() ? defaultUnit(request.type()) : request.unit().trim());
        goal.setStartDate(request.startDate());
        goal.setTargetDate(request.targetDate());
        goal.setDirection(request.direction() == null ? defaultDirection(request.type(), goal.getStartValue(), request.targetValue()) : request.direction());
        if (goal.getStartValue() == null) goal.setStartValue(metric(goal.getUser(), request.type(), request.startDate()).current());
        return response(goals.save(goal), email, true);
    }

    @Transactional public GoalResponse pause(String email, Long id) { Goal goal = owned(email, id); goal.setStatus(Status.PAUSED); return response(goals.save(goal), email, false); }
    @Transactional public GoalResponse resume(String email, Long id) { Goal goal = owned(email, id); goal.setStatus(Status.ACTIVE); goal.setCompletedDate(null); return response(goals.save(goal), email, true); }
    @Transactional public GoalResponse archive(String email, Long id) { Goal goal = owned(email, id); goal.setStatus(Status.ARCHIVED); return response(goals.save(goal), email, false); }
    @Transactional public void delete(String email, Long id) { goals.delete(owned(email, id)); }

    @Transactional(readOnly = true)
    public List<GoalResponse> active(String email) {
        User user = user(email);
        return goals.findByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), Status.ACTIVE).stream().map(goal -> response(goal, email, false)).toList();
    }

    private GoalResponse response(Goal goal, String email, boolean updateCompletion) {
        Metric metric = metric(goal.getUser(), goal.getType(), goal.getStartDate());
        Double current = metric.current();
        double progress = progress(goal, metric);
        Projection projection = projection(goal, metric);
        if (updateCompletion && goal.getStatus() == Status.ACTIVE && completesPermanently(goal.getType()) && progress >= 100) {
            goal.setStatus(Status.COMPLETED);
            goal.setCompletedDate(LocalDate.now());
            goals.save(goal);
        }
        String track = goal.getStatus() == Status.COMPLETED ? "COMPLETED"
            : goal.getStatus() != Status.ACTIVE ? goal.getStatus().name()
            : GoalMath.trackStatus(progress, goal.getStartDate(), goal.getTargetDate(), projection.date(), current != null);
        List<GoalTimelinePoint> timeline = timeline(goal, metric, projection);
        return new GoalResponse(goal.getId(), goal.getType(), goal.getTitle(), goal.getStartValue(), current,
            goal.getTargetValue(), goal.getUnit(), goal.getStartDate(), goal.getTargetDate(), goal.getStatus(),
            goal.getDirection(), progress, track, projection.pacePerWeek(), projection.date(), methodology(goal.getType()),
            goal.getCompletedDate(), timeline);
    }

    private double progress(Goal goal, Metric metric) {
        if (metric.current() == null) return 0;
        return switch (goal.getType()) {
            case WEIGHT, BODY_FAT, WAIST -> goal.getStartValue() == null ? 0 : GoalMath.directionalProgress(goal.getStartValue(), metric.current(), goal.getTargetValue(), goal.getDirection());
            case PROTEIN, CALORIES, WATER -> GoalMath.clamp(metric.daysMet() * 100d / 7d);
            case SLEEP -> GoalMath.clamp(metric.current() / goal.getTargetValue() * 100d);
            case WORKOUT_FREQUENCY, STREAK -> GoalMath.clamp(metric.current() / goal.getTargetValue() * 100d);
        };
    }

    private Metric metric(User user, Type type, LocalDate startDate) {
        LocalDate today = LocalDate.now();
        LocalDate sevenDaysAgo = today.minusDays(6);
        return switch (type) {
            case WEIGHT, BODY_FAT, WAIST -> bodyMetric(user.getId(), type, startDate);
            case PROTEIN, CALORIES -> nutritionMetric(user, type, sevenDaysAgo, today);
            case WATER -> waterMetric(user, sevenDaysAgo, today);
            case SLEEP -> sleepMetric(user, sevenDaysAgo, today);
            case WORKOUT_FREQUENCY -> workoutMetric(user, today);
            case STREAK -> {
                double value = streaks.calculate(user.getEmail()).current();
                yield new Metric(value, (int) value, new TreeMap<>(Map.of(today, value)));
            }
        };
    }

    private Metric bodyMetric(Long userId, Type type, LocalDate startDate) {
        TreeMap<LocalDate, Double> series = new TreeMap<>();
        List<BodyMeasurement> all = measurements.findByUserIdOrderByMeasuredOnDesc(userId);
        Double latest = all.stream().map(item -> bodyValue(item, type)).filter(Objects::nonNull).findFirst().orElse(null);
        all.stream()
            .filter(item -> !item.getMeasuredOn().isBefore(startDate))
            .sorted(Comparator.comparing(BodyMeasurement::getMeasuredOn))
            .forEach(item -> {
                Double value = bodyValue(item, type);
                if (value != null) series.put(item.getMeasuredOn(), value);
            });
        return new Metric(series.isEmpty() ? latest : series.lastEntry().getValue(), 0, series);
    }

    private Double bodyValue(BodyMeasurement item, Type type) { return switch (type) { case WEIGHT -> item.getWeightKg(); case BODY_FAT -> item.getBodyFatPercentage(); case WAIST -> item.getWaistCm(); default -> null; }; }

    private Metric nutritionMetric(User user, Type type, LocalDate from, LocalDate to) {
        TreeMap<LocalDate, Double> series = new TreeMap<>();
        meals.findByUserIdAndEatenAtBetween(user.getId(), from.atStartOfDay(), to.plusDays(1).atStartOfDay()).forEach(meal -> {
            NutritionTotalsCalculator.Totals totals = nutritionTotals.calculate(meal);
            series.merge(meal.getEatenAt().toLocalDate(), type == Type.PROTEIN ? totals.protein() : totals.calories(), Double::sum);
        });
        double target = type == Type.PROTEIN ? profileValue(user, "protein", 150) : profileValue(user, "calories", 2200);
        int met = (int) series.values().stream().filter(value -> type == Type.CALORIES ? value >= target * .9 && value <= target * 1.1 : value >= target).count();
        return new Metric(series.get(LocalDate.now()), met, series);
    }

    private Metric waterMetric(User user, LocalDate from, LocalDate to) {
        TreeMap<LocalDate, Double> series = new TreeMap<>();
        waterLogs.findByUserIdAndLoggedAtBetween(user.getId(), from.atStartOfDay(), to.plusDays(1).atStartOfDay())
            .forEach(log -> series.merge(log.getLoggedAt().toLocalDate(), log.getAmountMl().doubleValue(), Double::sum));
        double target = profileValue(user, "water", 2500);
        int met = (int) series.values().stream().filter(value -> value >= target).count();
        return new Metric(series.get(LocalDate.now()), met, series);
    }

    private Metric sleepMetric(User user, LocalDate from, LocalDate to) {
        TreeMap<LocalDate, Double> series = new TreeMap<>();
        sleepLogs.findByUserIdAndStartedAtBetweenOrderByStartedAt(user.getId(), from.minusDays(1).atStartOfDay(), to.plusDays(1).atStartOfDay())
            .forEach(log -> series.put(log.getEndedAt().toLocalDate(), Duration.between(log.getStartedAt(), log.getEndedAt()).toMinutes() / 60d));
        double average = series.values().stream().mapToDouble(Double::doubleValue).average().orElse(Double.NaN);
        return new Metric(Double.isNaN(average) ? null : round(average), (int) series.values().stream().filter(value -> value >= 7).count(), series);
    }

    private Metric workoutMetric(User user, LocalDate today) {
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<Workout> data = workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(user.getId(), monday.atStartOfDay(), today.plusDays(1).atStartOfDay());
        TreeMap<LocalDate, Double> series = new TreeMap<>();
        data.forEach(workout -> series.merge(workout.getStartedAt().toLocalDate(), 1d, Double::sum));
        return new Metric((double) data.size(), data.size(), series);
    }

    private Projection projection(Goal goal, Metric metric) {
        if (!List.of(Type.WEIGHT, Type.BODY_FAT, Type.WAIST).contains(goal.getType()) || metric.series().size() < 2 || metric.current() == null)
            return new Projection(null, null);
        var first = metric.series().firstEntry();
        var last = metric.series().lastEntry();
        long days = ChronoUnit.DAYS.between(first.getKey(), last.getKey());
        if (days < 3) return new Projection(null, null);
        double pace = (last.getValue() - first.getValue()) / (days / 7d);
        LocalDate projected = GoalMath.projectedDate(last.getKey(), last.getValue(), goal.getTargetValue(), pace);
        return new Projection(round(pace), projected);
    }

    private List<GoalTimelinePoint> timeline(Goal goal, Metric metric, Projection projection) {
        List<GoalTimelinePoint> points = new ArrayList<>();
        if (goal.getStartValue() != null) points.add(new GoalTimelinePoint(goal.getStartDate(), round(goal.getStartValue()), goal.getUnit(), 0, "Goal started", false));
        metric.series().forEach((date, value) -> {
            if (date.equals(goal.getStartDate()) && goal.getStartValue() != null) return;
            double pointProgress = List.of(Type.WEIGHT, Type.BODY_FAT, Type.WAIST).contains(goal.getType()) && goal.getStartValue() != null
                ? GoalMath.directionalProgress(goal.getStartValue(), value, goal.getTargetValue(), goal.getDirection())
                : GoalMath.clamp(value / goal.getTargetValue() * 100d);
            points.add(new GoalTimelinePoint(date, round(value), goal.getUnit(), pointProgress, "Recorded", false));
        });
        if (projection.date() != null) points.add(new GoalTimelinePoint(projection.date(), goal.getTargetValue(), goal.getUnit(), 100, "Projected target", true));
        return points.stream().sorted(Comparator.comparing(GoalTimelinePoint::date)).toList();
    }

    private double profileValue(User user, String type, int fallback) {
        UserProfile profile = user.getProfile();
        if (profile == null) return fallback;
        Integer value = switch (type) { case "protein" -> profile.getProteinTarget(); case "water" -> profile.getHydrationTargetMl(); default -> profile.getCalorieTarget(); };
        return value == null ? fallback : value;
    }

    private Direction defaultDirection(Type type, Double current, Double target) {
        return switch (type) {
            case WEIGHT, BODY_FAT, WAIST -> current != null && target < current ? Direction.DECREASE : Direction.INCREASE;
            case CALORIES -> Direction.AT_MOST;
            default -> Direction.AT_LEAST;
        };
    }
    private String defaultUnit(Type type) { return switch (type) { case WEIGHT -> "kg"; case BODY_FAT -> "%"; case WAIST -> "cm"; case PROTEIN -> "g/day"; case CALORIES -> "kcal/day"; case WATER -> "mL/day"; case SLEEP -> "hours"; case WORKOUT_FREQUENCY -> "workouts/week"; case STREAK -> "days"; }; }
    private String methodology(Type type) { return switch (type) { case WEIGHT, BODY_FAT, WAIST -> "Progress uses your latest recorded body measurement relative to the value when the goal started."; case PROTEIN -> "Progress is the percentage of the last seven days that met the daily protein target."; case CALORIES -> "Progress is the percentage of the last seven days within 90–110% of the calorie target."; case WATER -> "Progress is the percentage of the last seven days that met the hydration target."; case SLEEP -> "Progress compares your seven-day average sleep duration with the goal."; case WORKOUT_FREQUENCY -> "Progress compares completed workouts this Monday–Sunday week with the weekly target."; case STREAK -> "Progress uses the current persisted activity streak."; }; }
    private boolean completesPermanently(Type type) { return List.of(Type.WEIGHT, Type.BODY_FAT, Type.WAIST, Type.STREAK).contains(type); }
    private void validateDates(LocalDate start, LocalDate target) { if (start.isAfter(LocalDate.now())) throw new IllegalArgumentException("Start date cannot be in the future"); if (target != null && !target.isAfter(start)) throw new IllegalArgumentException("Target date must be after the start date"); }
    private User user(String email) { return users.findByEmailIgnoreCase(email).orElseThrow(); }
    private Goal owned(String email, Long id) { User user = user(email); return goals.findByIdAndUserId(id, user.getId()).orElseThrow(() -> new IllegalArgumentException("Goal not found")); }
    private double round(double value) { return Math.round(value * 10d) / 10d; }
    private record Metric(Double current, int daysMet, TreeMap<LocalDate, Double> series) {}
    private record Projection(Double pacePerWeek, LocalDate date) {}
}
