package com.pulse.controller;

import com.pulse.dto.GoalDtos.*;
import com.pulse.service.GoalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/goals") @RequiredArgsConstructor
public class GoalController {
    private final GoalService goals;
    @GetMapping List<GoalResponse> list(Authentication auth) { return goals.list(auth.getName()); }
    @GetMapping("/{id}") GoalResponse get(Authentication auth, @PathVariable Long id) { return goals.get(auth.getName(), id); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) GoalResponse create(Authentication auth, @Valid @RequestBody GoalRequest request) { return goals.create(auth.getName(), request); }
    @PutMapping("/{id}") GoalResponse update(Authentication auth, @PathVariable Long id, @Valid @RequestBody GoalRequest request) { return goals.update(auth.getName(), id, request); }
    @PostMapping("/{id}/pause") GoalResponse pause(Authentication auth, @PathVariable Long id) { return goals.pause(auth.getName(), id); }
    @PostMapping("/{id}/resume") GoalResponse resume(Authentication auth, @PathVariable Long id) { return goals.resume(auth.getName(), id); }
    @PostMapping("/{id}/archive") GoalResponse archive(Authentication auth, @PathVariable Long id) { return goals.archive(auth.getName(), id); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(Authentication auth, @PathVariable Long id) { goals.delete(auth.getName(), id); }
}
