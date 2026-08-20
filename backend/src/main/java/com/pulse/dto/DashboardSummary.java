package com.pulse.dto;

public record DashboardSummary(
    int calories, int calorieTarget, int protein, int proteinTarget,
    int carbs, int carbsTarget, int fat, int fatTarget,
    int water, int waterTarget, double weight, int streak
) {}
