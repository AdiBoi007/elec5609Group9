package com.pulse.controller;

import com.pulse.entity.*;
import com.pulse.repository.*;
import com.pulse.dto.HealthDtos.*;
import com.pulse.service.HealthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.util.List;

@RestController @RequestMapping("/api") @RequiredArgsConstructor
public class HealthLogController {
    private final UserRepository users;
    private final WaterLogRepository waterLogs;
    private final SleepLogRepository sleepLogs;
    private final BodyMeasurementRepository measurements;
    private final HealthService healthService;

    @PostMapping("/water") @ResponseStatus(HttpStatus.CREATED)
    LogResponse addWater(Authentication auth, @Valid @RequestBody WaterRequest request) {
        WaterLog log = new WaterLog(); log.setUser(user(auth)); log.setAmountMl(request.amountMl()); log.setLoggedAt(request.loggedAt() == null ? LocalDateTime.now() : request.loggedAt()); waterLogs.save(log);
        return new LogResponse(log.getId(), "Water logged");
    }
    @DeleteMapping("/water/latest")
    WaterUndoResponse removeLatestWater(Authentication auth) {
        WaterLog log = waterLogs.findFirstByUserIdOrderByLoggedAtDesc(user(auth).getId())
            .orElseThrow(() -> new IllegalArgumentException("No water entry to remove"));
        waterLogs.delete(log);
        return new WaterUndoResponse(log.getId(), log.getAmountMl(), "Latest water entry removed");
    }
    @GetMapping("/water/summary") WaterSummary waterSummary(Authentication auth) { return healthService.waterSummary(auth.getName()); }
    @PostMapping("/sleep") @ResponseStatus(HttpStatus.CREATED) SleepResponse addSleep(Authentication auth, @Valid @RequestBody SleepRequest request) { return healthService.createSleep(auth.getName(), request); }
    @GetMapping("/sleep") List<SleepResponse> sleep(Authentication auth) { return healthService.sleepHistory(auth.getName()); }
    @PutMapping("/sleep/{id}") SleepResponse updateSleep(Authentication auth, @PathVariable Long id, @Valid @RequestBody SleepRequest request) { return healthService.updateSleep(auth.getName(), id, request); }
    @DeleteMapping("/sleep/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteSleep(Authentication auth, @PathVariable Long id) { healthService.deleteSleep(auth.getName(), id); }
    @GetMapping("/sleep/summary") SleepSummary sleepSummary(Authentication auth) { return healthService.sleepSummary(auth.getName()); }

    @PostMapping("/measurements") @ResponseStatus(HttpStatus.CREATED) BodyResponse addBody(Authentication auth, @Valid @RequestBody BodyRequest request) { return healthService.createBody(auth.getName(), request); }
    @GetMapping("/measurements") List<BodyResponse> body(Authentication auth) { return healthService.bodyHistory(auth.getName()); }
    @PutMapping("/measurements/{id}") BodyResponse updateBody(Authentication auth, @PathVariable Long id, @Valid @RequestBody BodyRequest request) { return healthService.updateBody(auth.getName(), id, request); }
    @DeleteMapping("/measurements/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteBody(Authentication auth, @PathVariable Long id) { healthService.deleteBody(auth.getName(), id); }
    @GetMapping("/measurements/summary") BodySummary bodySummary(Authentication auth) { return healthService.bodySummary(auth.getName()); }
    @PostMapping("/body") @ResponseStatus(HttpStatus.CREATED) BodyResponse addBodyCompatibility(Authentication auth, @Valid @RequestBody BodyRequest request) { return healthService.createBody(auth.getName(), request); }
    private User user(Authentication auth) { return users.findByEmailIgnoreCase(auth.getName()).orElseThrow(); }
    public record WaterRequest(@Min(1) @Max(5000) int amountMl, @PastOrPresent LocalDateTime loggedAt) {}
    public record LogResponse(Long id, String message) {}
    public record WaterUndoResponse(Long id, int amountMl, String message) {}
}
