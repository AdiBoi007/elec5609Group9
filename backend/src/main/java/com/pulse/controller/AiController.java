package com.pulse.controller;

import com.pulse.dto.AiDtos.*;
import com.pulse.service.AiService;
import com.pulse.service.InsightService;
import com.pulse.service.PulseAssistantService;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;

import java.util.List;
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
    @PostMapping("/ask") PulseAssistantService.PulseAnswer ask(Authentication auth, @Valid @RequestBody AskRequest request) { return assistant.ask(auth.getName(), request.question(), request.conversationId()); }
    @GetMapping("/conversations") List<PulseAssistantService.ConversationSummary> conversations(Authentication auth) { return assistant.listConversations(auth.getName()); }
    @GetMapping("/conversations/{id}") PulseAssistantService.ConversationDetail conversation(Authentication auth, @PathVariable Long id) { return assistant.conversation(auth.getName(), id); }
    @DeleteMapping("/conversations/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteConversation(Authentication auth, @PathVariable Long id) { assistant.deleteConversation(auth.getName(), id); }
    @DeleteMapping("/conversations") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteAllConversations(Authentication auth) { assistant.deleteAllConversations(auth.getName()); }
    public record AskRequest(@NotBlank @Size(max = 1000) String question, Long conversationId) {}
    @GetMapping("/meal-suggestions") PulseAssistantService.MealSuggestionResponse mealSuggestions(Authentication auth) { return assistant.mealSuggestions(auth.getName()); }
    @GetMapping("/finish-day") PulseAssistantService.FinishDayResponse finishDay(Authentication auth) { return assistant.finishDay(auth.getName()); }
}
