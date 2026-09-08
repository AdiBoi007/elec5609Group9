package com.pulse.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.entity.AssistantConversation;
import com.pulse.entity.User;
import com.pulse.repository.AssistantConversationRepository;
import com.pulse.repository.AssistantMessageRepository;
import com.pulse.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class PulseAssistantSafetyTest {
    private static final String EMAIL = "user@example.com";

    private final DashboardService dashboard = mock(DashboardService.class);
    private final ProgressService progress = mock(ProgressService.class);
    private final HealthCalendarService calendar = mock(HealthCalendarService.class);
    private final GoalService goals = mock(GoalService.class);
    private final UserRepository users = mock(UserRepository.class);
    private final AiService ai = mock(AiService.class);
    private final AssistantConversationRepository conversations = mock(AssistantConversationRepository.class);
    private final AssistantMessageRepository messages = mock(AssistantMessageRepository.class);

    private PulseAssistantService service() {
        User user = new User(); user.setId(1L); user.setEmail(EMAIL);
        AssistantConversation conversation = new AssistantConversation(); conversation.setId(7L); conversation.setUser(user);
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));
        when(conversations.save(any(AssistantConversation.class))).thenReturn(conversation);
        when(goals.active(EMAIL)).thenReturn(List.of());
        return new PulseAssistantService(dashboard, progress, calendar, goals, users, ai, conversations, messages, new ObjectMapper());
    }

    @Test void chineseSymptomQuestionHitsTheSafetyBranch() {
        var answer = service().ask(EMAIL, "我最近跑步的时候胸痛，是怎么回事", null);

        assertThat(answer.title()).isEqualTo("Health and safety");
        assertThat(answer.summary()).contains("cannot assess symptoms");
        assertThat(answer.generatedByAi()).isFalse();
    }

    @Test void safetyResponseIsNeverParaphrasedByTheModel() {
        service().ask(EMAIL, "I have chest pain after training", null);

        verify(ai, never()).chat(anyString(), any(), any(), any());
    }

    @Test void safetyBranchStillPersistsTheExchange() {
        service().ask(EMAIL, "头晕得厉害", null);

        verify(messages, times(2)).save(any());
    }
}
