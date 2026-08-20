package com.pulse.controller;

import com.pulse.service.WorkoutService;
import com.pulse.service.WorkoutService.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/workouts") @RequiredArgsConstructor
public class WorkoutController {
    private final WorkoutService service;
    @GetMapping List<WorkoutSummary> history(Authentication auth) { return service.history(auth.getName()); }
    @GetMapping("/records") PersonalRecords records(Authentication auth) { return service.records(auth.getName()); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) WorkoutSummary create(Authentication auth, @Valid @RequestBody CreateWorkoutRequest request) { return service.create(auth.getName(), request); }
    @GetMapping("/{id}") WorkoutDetail detail(Authentication auth, @PathVariable Long id) { return service.detail(auth.getName(), id); }
    @PostMapping("/{id}/repeat") @ResponseStatus(HttpStatus.CREATED) WorkoutSummary repeat(Authentication auth, @PathVariable Long id) { return service.repeat(auth.getName(), id); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(Authentication auth, @PathVariable Long id) { service.delete(auth.getName(), id); }
}
