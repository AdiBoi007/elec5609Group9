package com.pulse.service;

import com.pulse.dto.ProgressDtos.*;
import com.pulse.entity.User;
import com.pulse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class StreakService {
    private final UserRepository users;
    private final WorkoutRepository workouts;
    private final MealRepository meals;
    private final WaterLogRepository waterLogs;
    private final SleepLogRepository sleepLogs;

    @Transactional(readOnly = true)
    public StreakSummary calculate(String email) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusYears(2);
        LocalDateTime start = startDate.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();
        SortedSet<LocalDate> active = new TreeSet<>();
        workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(user.getId(), start, end).forEach(value -> active.add(value.getStartedAt().toLocalDate()));
        meals.findByUserIdAndEatenAtBetween(user.getId(), start, end).forEach(value -> active.add(value.getEatenAt().toLocalDate()));
        waterLogs.findByUserIdAndLoggedAtBetween(user.getId(), start, end).forEach(value -> active.add(value.getLoggedAt().toLocalDate()));
        sleepLogs.findByUserIdAndStartedAtBetweenOrderByStartedAt(user.getId(), start, end).forEach(value -> active.add(value.getEndedAt().toLocalDate()));

        int longest = 0, running = 0;
        LocalDate previous = null;
        for (LocalDate date : active) {
            running = previous != null && date.equals(previous.plusDays(1)) ? running + 1 : 1;
            longest = Math.max(longest, running);
            previous = date;
        }
        LocalDate cursor = active.contains(today) ? today : today.minusDays(1);
        int current = 0;
        while (active.contains(cursor)) { current++; cursor = cursor.minusDays(1); }
        List<StreakDay> lastSeven = new ArrayList<>();
        for (int i = 6; i >= 0; i--) { LocalDate date = today.minusDays(i); lastSeven.add(new StreakDay(date, active.contains(date))); }
        return new StreakSummary(current, longest, lastSeven, active.stream().sorted(Comparator.reverseOrder()).limit(60).toList());
    }
}
