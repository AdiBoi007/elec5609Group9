package com.pulse.controller;

import com.pulse.service.NutritionCalculatorService;
import jakarta.validation.constraints.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequestMapping("/api/nutrition") @RequiredArgsConstructor
public class NutritionController {
    private final NutritionCalculatorService calculator;
    @PostMapping("/targets") Map<String, Object> targets(@Valid @RequestBody TargetRequest request) { return calculator.calculate(request.age(), request.gender(), request.heightCm(), request.weightKg(), request.activityLevel(), request.goal()); }
    record TargetRequest(@Min(13) @Max(120) int age, @NotBlank @Pattern(regexp = "(?i)male|female|non-binary|prefer not to say", message = "must be a supported value") @Size(max = 40) String gender,
        @DecimalMin("80.0") @DecimalMax("250.0") double heightCm,
        @DecimalMin("25.0") @DecimalMax("500.0") double weightKg,
        @NotBlank @Pattern(regexp = "(?i)sedentary|light|lightly active|lightly_active|active|moderately active|moderately_active|very active|very_active", message = "must be a supported value") @Size(max = 60) String activityLevel,
        @NotBlank @Pattern(regexp = "(?i)lose weight|lose_weight|maintain|build muscle|build_muscle|gain weight|gain_weight", message = "must be a supported value") @Size(max = 60) String goal) {}
}
