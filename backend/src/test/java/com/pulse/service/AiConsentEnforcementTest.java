package com.pulse.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.dto.AiDtos.MealPlanRequest;
import com.pulse.dto.AiDtos.WorkoutPlanRequest;
import com.pulse.entity.GeneratedMealPlan;
import com.pulse.entity.GeneratedWorkoutPlan;
import com.pulse.entity.User;
import com.pulse.entity.UserProfile;
import com.pulse.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** The plan and insight services must pass each user's own AI consent through to AiService. */
class AiConsentEnforcementTest {
    private static final String EMAIL = "user@example.com";

    private final ObjectMapper mapper = new ObjectMapper();
    private final UserRepository users = mock(UserRepository.class);
    private final GeneratedWorkoutPlanRepository workoutPlans = mock(GeneratedWorkoutPlanRepository.class);
    private final GeneratedMealPlanRepository mealPlans = mock(GeneratedMealPlanRepository.class);
    private final ConsentService consent = mock(ConsentService.class);
    private MockRestServiceServer openAi;
    private PlanService plans;
    private User user;

    @BeforeEach void setUp() {
        user = new User(); user.setId(1L); user.setEmail(EMAIL);
        UserProfile profile = new UserProfile(); profile.setUser(user); profile.setDietaryPattern("OMNIVORE"); profile.setPreferredMealsPerDay(3);
        user.setProfile(profile);
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));
        when(workoutPlans.save(any(GeneratedWorkoutPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mealPlans.save(any(GeneratedMealPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RestClient.Builder builder = RestClient.builder();
        openAi = MockRestServiceServer.bindTo(builder).build();
        AiService ai = new AiService("sk-test", "gpt-test", mapper, builder);
        plans = new PlanService(users, workoutPlans, mealPlans, mock(GroceryListRepository.class), mock(GroceryItemRepository.class), ai, mapper, new DietaryProfileService(), consent);
    }

    @Test void plansForAUserWithoutConsentNeverReachOpenAi() {
        when(consent.aiAllowed(user)).thenReturn(false);

        var workout = plans.generateWorkout(EMAIL, new WorkoutPlanRequest("Muscle Gain", "Intermediate", 3, 45, List.of("Dumbbells"), "Knee-friendly"));
        var meal = plans.generateMeal(EMAIL, new MealPlanRequest(2200, 150, 250, 70, "Balanced", "", "", 3));

        assertThat(workout.plan().generatedByAi()).isFalse();
        assertThat(meal.plan().generatedByAi()).isFalse();
        openAi.verify();
    }

    @Test void aConsentedUsersWorkoutPlanIsGeneratedByOpenAi() {
        when(consent.aiAllowed(user)).thenReturn(true);
        String plan = "{\"name\":\"AI Strength\",\"goal\":\"Muscle Gain\",\"summary\":\"Three days\",\"days\":[{\"name\":\"Day 1\",\"focus\":\"Legs\",\"exercises\":[{\"name\":\"Goblet Squat\",\"sets\":3,\"reps\":\"10\",\"restSeconds\":90,\"notes\":\"Slow\"}]}]}";
        openAi.expect(requestTo("https://api.openai.com/v1/responses"))
            .andRespond(withSuccess(AiServiceConsentTest.openAiResponse(plan), MediaType.APPLICATION_JSON));

        var workout = plans.generateWorkout(EMAIL, new WorkoutPlanRequest("Muscle Gain", "Intermediate", 3, 45, List.of("Dumbbells"), ""));

        assertThat(workout.plan().generatedByAi()).isTrue();
        assertThat(workout.name()).isEqualTo("AI Strength");
        openAi.verify();
    }

    @Test void insightsPassTheUsersConsent() {
        AiService ai = mock(AiService.class);
        InsightService insights = new InsightService(users, mock(WorkoutRepository.class), mock(MealRepository.class), mock(WaterLogRepository.class), mock(SleepLogRepository.class), mock(BodyMeasurementRepository.class), ai, mock(DietaryProfileService.class), consent);
        when(consent.aiAllowed(user)).thenReturn(false);

        insights.insights(EMAIL);

        verify(ai).insights(any(), eq(false));
    }
}
