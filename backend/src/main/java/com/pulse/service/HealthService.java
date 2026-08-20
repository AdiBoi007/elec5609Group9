package com.pulse.service;

import com.pulse.dto.HealthDtos.*;
import com.pulse.entity.*;
import com.pulse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor
public class HealthService {
    private final UserRepository users;
    private final SleepLogRepository sleepLogs;
    private final BodyMeasurementRepository measurements;
    private final WaterLogRepository waterLogs;

    @Transactional(readOnly = true)
    public List<SleepResponse> sleepHistory(String email) {
        return sleepLogs.findByUserIdOrderByStartedAtDesc(user(email).getId()).stream().map(this::sleepResponse).toList();
    }

    @Transactional
    public SleepResponse createSleep(String email, SleepRequest request) {
        validateSleep(request);
        SleepLog log = new SleepLog();
        log.setUser(user(email));
        apply(log, request);
        return sleepResponse(sleepLogs.save(log));
    }

    @Transactional
    public SleepResponse updateSleep(String email, Long id, SleepRequest request) {
        validateSleep(request);
        SleepLog log = ownedSleep(email, id);
        apply(log, request);
        return sleepResponse(sleepLogs.save(log));
    }

    @Transactional
    public void deleteSleep(String email, Long id) { sleepLogs.delete(ownedSleep(email, id)); }

    @Transactional(readOnly = true)
    public SleepSummary sleepSummary(String email) {
        List<SleepResponse> history = sleepHistory(email);
        List<SleepResponse> recent = history.stream().filter(item -> !item.date().isBefore(LocalDate.now().minusDays(6))).toList();
        List<SleepResponse> previous = history.stream().filter(item -> item.date().isBefore(LocalDate.now().minusDays(6)) && !item.date().isBefore(LocalDate.now().minusDays(13))).toList();
        double average = recent.stream().mapToLong(SleepResponse::durationMinutes).average().orElse(0);
        double priorAverage = previous.stream().mapToLong(SleepResponse::durationMinutes).average().orElse(average);
        double quality = recent.stream().mapToInt(SleepResponse::quality).average().orElse(0);
        long lastNight = history.stream().filter(item -> item.date().equals(LocalDate.now())).findFirst().map(SleepResponse::durationMinutes).orElse(0L);
        return new SleepSummary(lastNight, rounded(average), rounded(quality), rounded(average - priorAverage), history);
    }

    @Transactional(readOnly = true)
    public List<BodyResponse> bodyHistory(String email) {
        return measurements.findByUserIdOrderByMeasuredOnDesc(user(email).getId()).stream().map(this::bodyResponse).toList();
    }

    @Transactional
    public BodyResponse createBody(String email, BodyRequest request) {
        requireMeasurement(request);
        BodyMeasurement measurement = new BodyMeasurement();
        measurement.setUser(user(email));
        apply(measurement, request);
        return bodyResponse(measurements.save(measurement));
    }

    @Transactional
    public BodyResponse updateBody(String email, Long id, BodyRequest request) {
        requireMeasurement(request);
        BodyMeasurement measurement = ownedMeasurement(email, id);
        apply(measurement, request);
        return bodyResponse(measurements.save(measurement));
    }

    @Transactional
    public void deleteBody(String email, Long id) { measurements.delete(ownedMeasurement(email, id)); }

    @Transactional(readOnly = true)
    public BodySummary bodySummary(String email) {
        List<BodyResponse> history = bodyHistory(email);
        BodyResponse latest = history.isEmpty() ? null : history.get(0);
        BodyResponse earliest = history.isEmpty() ? null : history.get(history.size() - 1);
        return new BodySummary(latest == null ? null : latest.weightKg(), difference(latest == null ? null : latest.weightKg(), earliest == null ? null : earliest.weightKg()),
            latest == null ? null : latest.bodyFatPercentage(), difference(latest == null ? null : latest.bodyFatPercentage(), earliest == null ? null : earliest.bodyFatPercentage()),
            latest == null ? null : latest.waistCm(), difference(latest == null ? null : latest.waistCm(), earliest == null ? null : earliest.waistCm()), history);
    }

    @Transactional(readOnly = true)
    public WaterSummary waterSummary(String email) {
        User user = user(email);
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.minusDays(6).atStartOfDay();
        List<WaterLog> logs = waterLogs.findByUserIdAndLoggedAtBetween(user.getId(), start, today.plusDays(1).atStartOfDay());
        Map<LocalDate, Integer> totals = new TreeMap<>();
        for (int i = 0; i < 7; i++) totals.put(today.minusDays(6 - i), 0);
        logs.forEach(log -> totals.merge(log.getLoggedAt().toLocalDate(), log.getAmountMl(), Integer::sum));
        List<DailyValue> history = totals.entrySet().stream().map(entry -> new DailyValue(entry.getKey(), entry.getValue())).toList();
        int target = user.getProfile() == null || user.getProfile().getHydrationTargetMl() == null ? 2500 : user.getProfile().getHydrationTargetMl();
        return new WaterSummary(totals.getOrDefault(today, 0), target, rounded(totals.values().stream().mapToInt(Integer::intValue).average().orElse(0)), history);
    }

    private void validateSleep(SleepRequest request) {
        if (!request.endedAt().isAfter(request.startedAt())) throw new IllegalArgumentException("Wake time must be after bedtime");
        if (Duration.between(request.startedAt(), request.endedAt()).compareTo(Duration.ofHours(24)) > 0) throw new IllegalArgumentException("Sleep duration must be 24 hours or less");
    }
    private void requireMeasurement(BodyRequest request) {
        if (request.weightKg() == null && request.chestCm() == null && request.waistCm() == null && request.hipsCm() == null && request.armsCm() == null && request.thighsCm() == null && request.bodyFatPercentage() == null)
            throw new IllegalArgumentException("Add at least one measurement");
    }
    private void apply(SleepLog log, SleepRequest request) { log.setStartedAt(request.startedAt()); log.setEndedAt(request.endedAt()); log.setQuality(request.quality()); log.setNotes(request.notes()); }
    private void apply(BodyMeasurement m, BodyRequest r) { m.setMeasuredOn(r.measuredOn() == null ? LocalDate.now() : r.measuredOn()); m.setWeightKg(r.weightKg()); m.setChestCm(r.chestCm()); m.setWaistCm(r.waistCm()); m.setHipsCm(r.hipsCm()); m.setArmsCm(r.armsCm()); m.setThighsCm(r.thighsCm()); m.setBodyFatPercentage(r.bodyFatPercentage()); m.setNotes(r.notes()); }
    private SleepResponse sleepResponse(SleepLog log) { return new SleepResponse(log.getId(), log.getEndedAt().toLocalDate(), log.getStartedAt(), log.getEndedAt(), ChronoUnit.MINUTES.between(log.getStartedAt(), log.getEndedAt()), log.getQuality(), log.getNotes()); }
    private BodyResponse bodyResponse(BodyMeasurement m) { return new BodyResponse(m.getId(), m.getMeasuredOn(), m.getWeightKg(), m.getBodyFatPercentage(), m.getChestCm(), m.getWaistCm(), m.getHipsCm(), m.getArmsCm(), m.getThighsCm(), m.getNotes()); }
    private SleepLog ownedSleep(String email, Long id) { SleepLog log = sleepLogs.findById(id).orElseThrow(() -> new IllegalArgumentException("Sleep entry not found")); if (!log.getUser().getEmail().equalsIgnoreCase(email)) throw new IllegalArgumentException("Sleep entry not found"); return log; }
    private BodyMeasurement ownedMeasurement(String email, Long id) { BodyMeasurement m = measurements.findById(id).orElseThrow(() -> new IllegalArgumentException("Measurement not found")); if (!m.getUser().getEmail().equalsIgnoreCase(email)) throw new IllegalArgumentException("Measurement not found"); return m; }
    private User user(String email) { return users.findByEmailIgnoreCase(email).orElseThrow(); }
    private Double difference(Double latest, Double earliest) { return latest == null || earliest == null ? null : rounded(latest - earliest); }
    private double rounded(double value) { return Math.round(value * 10d) / 10d; }
}
