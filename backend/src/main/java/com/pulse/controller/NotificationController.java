package com.pulse.controller;

import com.pulse.entity.*;
import com.pulse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.time.*;
import java.util.Arrays;
import java.util.List;

@RestController @RequestMapping("/api/notifications") @RequiredArgsConstructor
public class NotificationController {
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final ReminderRepository reminders;
    @GetMapping @Transactional NotificationList list(Authentication auth) { User user = user(auth); createDueReminderNotifications(user); return new NotificationList(notifications.countByUserIdAndReadAtIsNull(user.getId()), notifications.findTop20ByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(NotificationResponse::from).toList()); }
    @PutMapping("/{id}/read") @Transactional NotificationResponse read(Authentication auth, @PathVariable Long id) { Notification notification = owned(auth, id); notification.setReadAt(Instant.now()); return NotificationResponse.from(notifications.save(notification)); }
    @PutMapping("/read-all") @Transactional NotificationList readAll(Authentication auth) { User user = user(auth); List<Notification> items = notifications.findTop20ByUserIdOrderByCreatedAtDesc(user.getId()); items.forEach(item -> item.setReadAt(Instant.now())); notifications.saveAll(items); return new NotificationList(0, items.stream().map(NotificationResponse::from).toList()); }
    private User user(Authentication auth) { return users.findByEmailIgnoreCase(auth.getName()).orElseThrow(); }
    private void createDueReminderNotifications(User user) {
        ZoneId zone = ZoneId.systemDefault(); LocalDate today = LocalDate.now(zone); LocalTime now = LocalTime.now(zone); Instant from = today.atStartOfDay(zone).toInstant(); Instant to = today.plusDays(1).atStartOfDay(zone).toInstant(); String day = today.getDayOfWeek().name().substring(0, 3);
        reminders.findByUserIdOrderByType(user.getId()).stream().filter(Reminder::isEnabled).filter(reminder -> reminder.getReminderTime() != null && !reminder.getReminderTime().isAfter(now)).filter(reminder -> applies(reminder.getDaysOfWeek(), day, today.getDayOfWeek())).forEach(reminder -> {
            String type = "reminder-" + reminder.getType(); if (notifications.existsByUserIdAndTypeAndCreatedAtBetween(user.getId(), type, from, to)) return;
            String recurrence = reminder.getDaysOfWeek();
            String schedule = recurrence == null || recurrence.isBlank() ? "Every day" : recurrence.replace(',', ' ');
            Notification item = new Notification(); item.setUser(user); item.setType(type); item.setTitle(reminder.getTitle()); item.setMessage("Scheduled for " + reminder.getReminderTime().toString().substring(0, 5) + " · " + schedule); notifications.save(item);
        });
    }
    private boolean applies(String recurrence, String day, DayOfWeek dayOfWeek) { if (recurrence == null || recurrence.equals("EVERYDAY")) return true; if (recurrence.equals("WEEKDAYS")) return dayOfWeek.getValue() <= 5; return Arrays.asList(recurrence.split(",")).contains(day); }
    private Notification owned(Authentication auth, Long id) { Notification item = notifications.findById(id).orElseThrow(() -> new IllegalArgumentException("Notification not found")); if (!item.getUser().getId().equals(user(auth).getId())) throw new IllegalArgumentException("Notification not found"); return item; }
    public record NotificationList(long unreadCount, List<NotificationResponse> notifications) {}
    public record NotificationResponse(Long id, String type, String title, String message, Instant createdAt, boolean read) { static NotificationResponse from(Notification n) { return new NotificationResponse(n.getId(), n.getType(), n.getTitle(), n.getMessage(), n.getCreatedAt(), n.getReadAt() != null); }}
}
