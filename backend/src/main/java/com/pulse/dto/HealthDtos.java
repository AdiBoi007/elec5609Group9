package com.pulse.dto;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.List;

public final class HealthDtos {
    private HealthDtos() {}

    public record SleepRequest(@NotNull @PastOrPresent LocalDateTime startedAt, @NotNull @PastOrPresent LocalDateTime endedAt,
        @Min(1) @Max(5) int quality, @Size(max = 1000) String notes) {}
    public record SleepResponse(Long id, LocalDate date, LocalDateTime startedAt, LocalDateTime endedAt,
        long durationMinutes, int quality, String notes) {}
    public record SleepSummary(long lastNightMinutes, double averageMinutes, double averageQuality,
        double trendMinutes, List<SleepResponse> history) {}

    public record BodyRequest(@PastOrPresent LocalDate measuredOn,
        @DecimalMin("20.0") @DecimalMax("500.0") Double weightKg,
        @DecimalMin("10.0") @DecimalMax("400.0") Double chestCm,
        @DecimalMin("10.0") @DecimalMax("400.0") Double waistCm,
        @DecimalMin("10.0") @DecimalMax("400.0") Double hipsCm,
        @DecimalMin("10.0") @DecimalMax("400.0") Double armsCm,
        @DecimalMin("10.0") @DecimalMax("400.0") Double thighsCm,
        @DecimalMin("1.0") @DecimalMax("70.0") Double bodyFatPercentage,
        @Size(max = 1000) String notes) {}
    public record BodyResponse(Long id, LocalDate measuredOn, Double weightKg, Double bodyFatPercentage,
        Double chestCm, Double waistCm, Double hipsCm, Double armsCm, Double thighsCm, String notes) {}
    public record BodySummary(Double latestWeight, Double weightChange, Double latestBodyFat,
        Double bodyFatChange, Double latestWaist, Double waistChange, List<BodyResponse> history) {}

    public record WaterResponse(Long id, int amountMl, LocalDateTime loggedAt) {}
    public record WaterSummary(int todayMl, int targetMl, double sevenDayAverage, List<DailyValue> history) {}
    public record DailyValue(LocalDate date, double value) {}
}
