package com.pulse.dto;

import java.time.LocalTime;
import java.util.List;

public final class TodayDtos {
    private TodayDtos() {}

    public record TimelineItem(
        Long id,
        String type,
        LocalTime time,
        String title,
        String detail,
        String to
    ) {}

    public record Highlight(
        String type,
        String title,
        String detail,
        String tone
    ) {}

    public record TodaySummary(
        List<TimelineItem> timeline,
        List<Highlight> highlights
    ) {}
}
