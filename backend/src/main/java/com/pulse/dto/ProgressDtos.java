package com.pulse.dto;

import java.time.LocalDate;
import java.util.List;

public final class ProgressDtos {
    private ProgressDtos() {}
    public record WorkoutAnalytics(int count, int totalDurationMinutes, double trainingVolumeKg, double workoutsPerWeek) {}
    public record NutritionAnalytics(double averageCalories, double averageProtein, int calorieTargetDays, int proteinTargetDays) {}
    public record HydrationAnalytics(double averageDailyMl, double goalPercentage) {}
    public record SleepAnalytics(double averageMinutes, double averageQuality) {}
    public record BodyAnalytics(Double latestWeight, Double weightChange, Double latestBodyFat, Double bodyFatChange) {}
    public record ProgressPoint(LocalDate date, int workouts, int durationMinutes, double volumeKg, double calories,
        double protein, int waterMl, double sleepHours, Double weight) {}
    public record ProgressSummary(String range, LocalDate from, LocalDate to, WorkoutAnalytics workouts,
        NutritionAnalytics nutrition, HydrationAnalytics hydration, SleepAnalytics sleep,
        BodyAnalytics body, StreakSummary streak, List<ProgressPoint> timeline) {}
    public record StreakDay(LocalDate date, boolean active) {}
    public record StreakSummary(int current, int longest, List<StreakDay> lastSevenDays, List<LocalDate> activityDates) {}
    public record ComparisonMetric(String key, String label, double current, Double previous, Double percentChange, String unit) {}
    public record ComparisonSummary(String label, List<ComparisonMetric> metrics) {}
    public record RecoverySummary(int score, String rating, int sleepScore, int hydrationScore, int trainingLoadScore, String disclaimer) {}

    public enum DailyStatus { ON_TRACK, PARTIAL, OFF_TRACK, NO_DATA }
    public record NutritionDay(DailyStatus status, int score, double calories, int calorieTarget,
        double protein, int proteinTarget, double carbohydrates, int carbohydrateTarget,
        double fat, int fatTarget) {}
    public record HydrationDay(DailyStatus status, int score, int amountMl, int targetMl) {}
    public record SleepDay(DailyStatus status, int score, long minutes, double hours, double quality) {}
    public record ActivityItem(String name, int durationMinutes) {}
    public record ActivityDay(DailyStatus status, int score, int workouts, List<ActivityItem> entries) {}
    public record BodyDay(Double weight, Double bodyFatPercentage, Double waistCm) {}
    public record CalendarDay(LocalDate date, int score, DailyStatus status, NutritionDay nutrition,
        HydrationDay hydration, SleepDay sleep, ActivityDay activity, BodyDay body,
        List<String> wins, List<String> attentionAreas) {}
    public record CalendarSummary(int onTrackDays, int partialDays, int offTrackDays,
        int noDataDays, int currentStreak) {}
    public record CalendarMonth(int year, int month, List<CalendarDay> days, CalendarSummary summary) {}
}
