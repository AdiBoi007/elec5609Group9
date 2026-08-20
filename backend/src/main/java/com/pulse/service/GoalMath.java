package com.pulse.service;

import com.pulse.entity.Goal.Direction;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class GoalMath {
    private GoalMath() {}

    public static double directionalProgress(double start, double current, double target, Direction direction) {
        if (Double.compare(start, target) == 0) return targetReached(current, target, direction) ? 100 : 0;
        double raw = switch (direction) {
            case DECREASE, AT_MOST -> (start - current) / (start - target) * 100d;
            case INCREASE, AT_LEAST -> (current - start) / (target - start) * 100d;
            case MAINTAIN -> Math.abs(current - target) <= Math.max(0.1, Math.abs(target) * .02) ? 100 : 0;
        };
        return clamp(raw);
    }

    public static boolean targetReached(double current, double target, Direction direction) {
        return switch (direction) {
            case DECREASE, AT_MOST -> current <= target;
            case INCREASE, AT_LEAST -> current >= target;
            case MAINTAIN -> Math.abs(current - target) <= Math.max(0.1, Math.abs(target) * .02);
        };
    }

    public static LocalDate projectedDate(LocalDate latestDate, double current, double target, double weeklyPace) {
        if (Math.abs(weeklyPace) < .0001) return null;
        double weeks = (target - current) / weeklyPace;
        if (!Double.isFinite(weeks) || weeks <= 0 || weeks > 520) return null;
        return latestDate.plusDays(Math.max(1, Math.round(weeks * 7)));
    }

    public static String trackStatus(double progress, LocalDate start, LocalDate target, LocalDate projected, boolean hasData) {
        if (!hasData) return "NO_DATA";
        if (progress >= 100) return "COMPLETED";
        if (target == null) return progress >= 75 ? "ON_TRACK" : progress >= 40 ? "BUILDING" : "NEEDS_ATTENTION";
        if (projected != null) {
            if (projected.isBefore(target.minusDays(3))) return "AHEAD";
            if (!projected.isAfter(target.plusDays(3))) return "ON_TRACK";
            return "BEHIND";
        }
        long total = Math.max(1, ChronoUnit.DAYS.between(start, target));
        long elapsed = Math.max(0, Math.min(total, ChronoUnit.DAYS.between(start, LocalDate.now())));
        double expected = elapsed * 100d / total;
        return progress + 8 >= expected ? "ON_TRACK" : "BEHIND";
    }

    public static double clamp(double value) { return Math.max(0, Math.min(100, Math.round(value * 10d) / 10d)); }
}
