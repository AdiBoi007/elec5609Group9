package com.pulse.dto;

import com.pulse.entity.Goal.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;

public final class GoalDtos {
    private GoalDtos() {}

    public record GoalRequest(
        @NotNull Type type,
        @NotBlank @Size(max = 140) String title,
        @NotNull @DecimalMin("0.01") @DecimalMax("1000000") Double targetValue,
        @Size(max = 20) String unit,
        @NotNull LocalDate startDate,
        LocalDate targetDate,
        Direction direction
    ) {}

    public record GoalTimelinePoint(
        LocalDate date, Double value, String unit, double progress,
        String label, boolean projected
    ) {}

    public record GoalResponse(
        Long id, Type type, String title, Double startValue, Double currentValue,
        Double targetValue, String unit, LocalDate startDate, LocalDate targetDate,
        Status status, Direction direction, double progress, String trackStatus,
        Double pacePerWeek, LocalDate projectedDate, String methodology,
        LocalDate completedDate, List<GoalTimelinePoint> timeline
    ) {}
}
