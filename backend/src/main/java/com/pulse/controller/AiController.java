package com.pulse.controller;

import com.pulse.dto.AiDtos.*;
import com.pulse.service.AiService;
import com.pulse.service.InsightService;
import com.pulse.service.PulseAssistantService;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/ai") @RequiredArgsConstructor
public class AiController {
    private final AiService aiService;
    private final InsightService insightService;
    private final PulseAssistantService assistant;
    @PostMapping("/insights") InsightResponse insights(Authentication auth) { return insightService.insights(auth.getName()); }
    @PostMapping("/workout-plan") WorkoutPlanResponse workoutPlan(@Valid @RequestBody WorkoutPlanRequest request) { return aiService.workoutPlan(request); }
    @PostMapping("/meal-plan") MealPlanResponse mealPlan(@Valid @RequestBody MealPlanRequest request) { return aiService.mealPlan(request); }
    @PostMapping("/ask") PulseAssistantService.PulseAnswer ask(Authentication auth, @RequestBody java.util.Map<String, String> body) { String question = body.getOrDefault("question", ""); if (question.isBlank()) throw new IllegalArgumentException("Question is required"); return assistant.ask(auth.getName(), question); }
    @GetMapping("/meal-suggestions") PulseAssistantService.MealSuggestionResponse mealSuggestions(Authentication auth) { return assistant.mealSuggestions(auth.getName()); }
    @GetMapping("/finish-day") PulseAssistantService.FinishDayResponse finishDay(Authentication auth) { return assistant.finishDay(auth.getName()); }
}
