package com.pulse.controller;

import com.pulse.entity.*;
import com.pulse.repository.*;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalTime;
import java.util.List;

@RestController @RequestMapping("/api/reminders") @RequiredArgsConstructor
public class ReminderController {
    private final ReminderRepository reminders;
    private final UserRepository users;

    @GetMapping List<ReminderResponse> list(Authentication auth) {
        return reminders.findByUserIdOrderByType(user(auth).getId()).stream().map(ReminderResponse::from).toList();
    }

    @PutMapping("/{type}") @Transactional
    ReminderResponse update(Authentication auth, @PathVariable String type, @Valid @RequestBody ReminderUpdate request) {
        String normalizedType = type.toLowerCase();
        if (!List.of("workouts", "meals", "water", "weigh-in", "sleep").contains(normalizedType)) throw new IllegalArgumentException("Unknown reminder type");
        User user = user(auth);
        Reminder reminder = reminders.findByUserIdAndTypeIgnoreCase(user.getId(), type).orElseGet(() -> {
            Reminder created = new Reminder(); created.setUser(user); created.setType(type.toLowerCase()); created.setTitle(title(type)); created.setReminderTime(LocalTime.of(9, 0)); return created;
        });
        reminder.setEnabled(request.enabled());
        if (request.reminderTime() != null) reminder.setReminderTime(request.reminderTime());
        if (request.daysOfWeek() != null) reminder.setDaysOfWeek(request.daysOfWeek());
        return ReminderResponse.from(reminders.save(reminder));
    }
    private User user(Authentication auth) { return users.findByEmailIgnoreCase(auth.getName()).orElseThrow(); }
    private String title(String type) { return "Pulse " + type.toLowerCase() + " reminder"; }
    public record ReminderUpdate(boolean enabled, LocalTime reminderTime,
        @Pattern(regexp = "EVERYDAY|WEEKDAYS|(?:MON|TUE|WED|THU|FRI|SAT|SUN)(?:,(?:MON|TUE|WED|THU|FRI|SAT|SUN))*", message = "must be a supported recurrence") String daysOfWeek) {}
    public record ReminderResponse(Long id, String type, String title, LocalTime reminderTime, String daysOfWeek, boolean enabled) {
        static ReminderResponse from(Reminder reminder) { return new ReminderResponse(reminder.getId(), reminder.getType(), reminder.getTitle(), reminder.getReminderTime(), reminder.getDaysOfWeek(), reminder.isEnabled()); }
    }
}
