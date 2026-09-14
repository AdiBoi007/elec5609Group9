package com.pulse.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.dto.AiDtos.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Proves the consent flag, not just the API key, decides whether a request reaches OpenAI.
 * The mock server has no expectations unless a test adds one, so any unexpected call fails
 * with an AssertionError that AiService's exception handling does not swallow.
 */
class AiServiceConsentTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private MockRestServiceServer server;
    private AiService service;

    @BeforeEach void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new AiService("sk-test", "gpt-test", mapper, builder);
    }

    @Test void withoutConsentNoFeatureCallsOpenAiEvenWithAKey() {
        var fallback = new AiService.ChatText("Protein today", "You have 40 g remaining.", List.of("40 g remaining"), false);

        assertThat(service.chat("How is my protein?", List.of(), Map.of(), fallback, false)).isSameAs(fallback);
        assertThat(service.insights(new InsightRequest(Map.of(), List.of(), List.of(), List.of(), List.of()), false).generatedByAi()).isFalse();
        assertThat(service.workoutPlan(workoutRequest(), false).generatedByAi()).isFalse();
        assertThat(service.mealPlan(new MealPlanRequest(2200, 150, 250, 70, "Balanced", "", "", 3), false).generatedByAi()).isFalse();

        server.verify();
    }

    @Test void withConsentTheRequestIsSentAndTheAnswerIsUsed() {
        String text = "{\"title\":\"Protein\",\"answer\":\"Add a protein snack.\",\"evidence\":[\"60 g logged\"]}";
        server.expect(requestTo("https://api.openai.com/v1/responses"))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withSuccess(openAiResponse(text), MediaType.APPLICATION_JSON));

        var answer = service.chat("How is my protein?", List.of(), Map.of(), new AiService.ChatText("t", "a", List.of(), false), true);

        assertThat(answer.generatedByAi()).isTrue();
        assertThat(answer.answer()).isEqualTo("Add a protein snack.");
        server.verify();
    }

    @Test void consentWithoutAKeyStillSendsNothing() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer keyless = MockRestServiceServer.bindTo(builder).build();
        AiService noKey = new AiService("", "gpt-test", mapper, builder);

        assertThat(noKey.workoutPlan(workoutRequest(), true).generatedByAi()).isFalse();
        keyless.verify();
    }

    private WorkoutPlanRequest workoutRequest() {
        return new WorkoutPlanRequest("Muscle Gain", "Intermediate", 3, 45, List.of("Dumbbells"), "No jumping");
    }

    static String openAiResponse(String text) {
        try {
            return new ObjectMapper().writeValueAsString(Map.of("output", List.of(Map.of("content", List.of(Map.of("text", text))))));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
