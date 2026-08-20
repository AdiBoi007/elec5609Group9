package com.pulse.controller;

import com.pulse.dto.ProgressDtos.*;
import com.pulse.service.*;
import lombok.RequiredArgsConstructor;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api") @RequiredArgsConstructor @Validated
public class ProgressController {
    private final ProgressService progressService;
    private final StreakService streakService;
    private final HealthCalendarService healthCalendarService;
    @GetMapping("/progress") ProgressSummary progress(Authentication auth, @RequestParam(defaultValue = "week") String range) { return progressService.get(auth.getName(), range); }
    @GetMapping("/progress/compare") ComparisonSummary compare(Authentication auth) { return progressService.compare(auth.getName()); }
    @GetMapping("/progress/recovery") RecoverySummary recovery(Authentication auth) { return progressService.recovery(auth.getName()); }
    @GetMapping("/progress/calendar") CalendarMonth calendar(Authentication auth,
        @RequestParam @Min(2000) @Max(2100) int year,
        @RequestParam @Min(1) @Max(12) int month) { return healthCalendarService.get(auth.getName(), year, month); }
    @GetMapping("/streak") StreakSummary streak(Authentication auth) { return streakService.calculate(auth.getName()); }
}
