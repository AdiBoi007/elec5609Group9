package com.pulse.controller;

import com.pulse.service.MealService;
import com.pulse.service.MealService.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/meals") @RequiredArgsConstructor
public class MealController {
    private final MealService service;
    @GetMapping List<MealResponse> history(Authentication auth, @RequestParam(defaultValue = "1") int days) { return service.history(auth.getName(), days); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) MealResponse log(Authentication auth, @Valid @RequestBody MealRequest request) { return service.log(auth.getName(), request); }
    @GetMapping("/food-shortcuts") List<FoodShortcut> foodShortcuts(Authentication auth, @RequestParam(defaultValue = "recent") String mode) { return service.foodShortcuts(auth.getName(), mode); }
    @PostMapping("/{id}/repeat") @ResponseStatus(HttpStatus.CREATED) MealResponse repeat(Authentication auth, @PathVariable Long id) { return service.repeat(auth.getName(), id); }
    @PostMapping("/repeat-last") @ResponseStatus(HttpStatus.CREATED) MealResponse repeatLast(Authentication auth, @RequestParam(required = false) String type) { return service.repeatLast(auth.getName(), type); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(Authentication auth, @PathVariable Long id) { service.delete(auth.getName(), id); }
}
