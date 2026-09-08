package com.pulse.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.entity.AssistantConversation;
import com.pulse.entity.AssistantMessage;
import com.pulse.dto.DashboardSummary;
import com.pulse.entity.User;
import com.pulse.repository.AssistantConversationRepository;
import com.pulse.repository.AssistantMessageRepository;
import com.pulse.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class PulseAssistantMemoryTest {
    private static final String EMAIL = "user@example.com";
    private static final String OTHER = "attacker@example.com";

    private final DashboardService dashboard = mock(DashboardService.class);
    private final ProgressService progress = mock(ProgressService.class);
    private final HealthCalendarService calendar = mock(HealthCalendarService.class);
    private final GoalService goals = mock(GoalService.class);
    private final UserRepository users = mock(UserRepository.class);
    private final AiService ai = mock(AiService.class);
    private final AssistantConversationRepository conversations = mock(AssistantConversationRepository.class);
    private final AssistantMessageRepository messages = mock(AssistantMessageRepository.class);
    private final ObjectMapper mapper = new ObjectMapper();

    private PulseAssistantService service;
    private User user;
    private User other;
    private AssistantConversation conversation;

    @BeforeEach void setUp() {
        user = new User(); user.setId(1L); user.setEmail(EMAIL);
        other = new User(); other.setId(2L); other.setEmail(OTHER);
        conversation = new AssistantConversation(); conversation.setId(7L); conversation.setUser(user);

        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));
        when(users.findByEmailIgnoreCase(OTHER)).thenReturn(Optional.of(other));
        when(conversations.save(any(AssistantConversation.class))).thenReturn(conversation);
        when(goals.active(anyString())).thenReturn(List.of());
        // Every branch reads the dashboard, so give it real numbers. These questions all land
        // on the protein branch, which is the smallest slice of data that exercises ask().
        when(dashboard.get(anyString())).thenReturn(new DashboardSummary(0, 1800, 60, 120, 0, 200, 0, 60, 0, 2500, 0d, 0));
        when(ai.chat(anyString(), any(), any(), any()))
            .thenReturn(new AiService.ChatText("Protein today", "You have 40 g remaining.", List.of("40 g remaining"), true));

        service = new PulseAssistantService(dashboard, progress, calendar, goals, users, ai, conversations, messages, mapper);
    }

    // 1. A first question opens a conversation and hands its id back.

    @Test void firstQuestionCreatesAConversationAndReturnsItsId() {
        var answer = service.ask(EMAIL, "How is my protein?", null);

        assertThat(answer.conversationId()).isEqualTo(7L);
        verify(conversations, atLeastOnce()).save(any(AssistantConversation.class));
    }

    @Test void newConversationIsTitledFromTheQuestion() {
        var captor = ArgumentCaptor.forClass(AssistantConversation.class);
        service.ask(EMAIL, "How is my protein?", null);

        verify(conversations, atLeastOnce()).save(captor.capture());
        assertThat(captor.getAllValues().get(0).getTitle()).isEqualTo("How is my protein?");
    }

    // 2. A follow-up reuses the conversation instead of starting a new one.

    @Test void followUpReusesTheExistingConversation() {
        when(conversations.findByIdAndUserId(7L, 1L)).thenReturn(Optional.of(conversation));

        var answer = service.ask(EMAIL, "And my protein target?", 7L);

        assertThat(answer.conversationId()).isEqualTo(7L);
        verify(conversations).findByIdAndUserId(7L, 1L);
    }

    // 3. The point of the feature: earlier turns reach the model.

    @Test void earlierTurnsArePassedToTheModel() {
        when(conversations.findByIdAndUserId(7L, 1L)).thenReturn(Optional.of(conversation));
        when(messages.findTop40ByConversationIdOrderByCreatedAtDesc(7L))
            .thenReturn(List.of(message("ASSISTANT", "You have 40 g remaining."), message("USER", "How is my protein?")));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AiService.Turn>> captor = ArgumentCaptor.forClass(List.class);
        service.ask(EMAIL, "And my protein target?", 7L);

        verify(ai).chat(anyString(), captor.capture(), any(), any());
        assertThat(captor.getValue()).extracting(AiService.Turn::content)
            .containsExactly("How is my protein?", "You have 40 g remaining.");
    }

    @Test void historyIsOrderedOldestFirst() {
        when(conversations.findByIdAndUserId(7L, 1L)).thenReturn(Optional.of(conversation));
        when(messages.findTop40ByConversationIdOrderByCreatedAtDesc(7L))
            .thenReturn(List.of(message("USER", "third"), message("USER", "second"), message("USER", "first")));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AiService.Turn>> captor = ArgumentCaptor.forClass(List.class);
        service.ask(EMAIL, "protein again?", 7L);

        verify(ai).chat(anyString(), captor.capture(), any(), any());
        assertThat(captor.getValue()).extracting(AiService.Turn::content).containsExactly("first", "second", "third");
    }

    @Test void dozensOfShortTurnsAllFitInTheHistory() {
        when(conversations.findByIdAndUserId(7L, 1L)).thenReturn(Optional.of(conversation));
        List<AssistantMessage> thirty = new java.util.ArrayList<>();
        for (int i = 30; i >= 1; i--) thirty.add(message("USER", "turn " + i));
        when(messages.findTop40ByConversationIdOrderByCreatedAtDesc(7L)).thenReturn(thirty);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AiService.Turn>> captor = ArgumentCaptor.forClass(List.class);
        service.ask(EMAIL, "protein again?", 7L);

        verify(ai).chat(anyString(), captor.capture(), any(), any());
        assertThat(captor.getValue()).hasSize(30);
        assertThat(captor.getValue().get(0).content()).isEqualTo("turn 1");
        assertThat(captor.getValue().get(29).content()).isEqualTo("turn 30");
    }

    @Test void longMessagesAreTrimmedToTheCharacterBudget() {
        when(conversations.findByIdAndUserId(7L, 1L)).thenReturn(Optional.of(conversation));
        String bulky = "x".repeat(2500);
        when(messages.findTop40ByConversationIdOrderByCreatedAtDesc(7L))
            .thenReturn(List.of(message("USER", bulky + "d"), message("USER", bulky + "c"),
                message("USER", bulky + "b"), message("USER", bulky + "a")));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AiService.Turn>> captor = ArgumentCaptor.forClass(List.class);
        service.ask(EMAIL, "protein again?", 7L);

        verify(ai).chat(anyString(), captor.capture(), any(), any());
        // 6000 char budget fits two 2501-char messages, and the newest survive.
        assertThat(captor.getValue()).hasSize(2);
        assertThat(captor.getValue()).extracting(turn -> turn.content().substring(2500))
            .containsExactly("c", "d");
    }

    @Test void aSingleOversizedMessageIsStillKept() {
        when(conversations.findByIdAndUserId(7L, 1L)).thenReturn(Optional.of(conversation));
        when(messages.findTop40ByConversationIdOrderByCreatedAtDesc(7L))
            .thenReturn(List.of(message("USER", "y".repeat(7000))));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AiService.Turn>> captor = ArgumentCaptor.forClass(List.class);
        service.ask(EMAIL, "protein again?", 7L);

        verify(ai).chat(anyString(), captor.capture(), any(), any());
        assertThat(captor.getValue()).hasSize(1);
    }

    @Test void aBrandNewConversationSendsNoHistory() {
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AiService.Turn>> captor = ArgumentCaptor.forClass(List.class);
        service.ask(EMAIL, "How is my protein?", null);

        verify(ai).chat(anyString(), captor.capture(), any(), any());
        assertThat(captor.getValue()).isEmpty();
    }

    // 4. Both sides of the exchange are stored.

    @Test void bothTheQuestionAndTheAnswerArePersisted() {
        var captor = ArgumentCaptor.forClass(AssistantMessage.class);
        service.ask(EMAIL, "How is my protein?", null);

        verify(messages, times(2)).save(captor.capture());
        assertThat(captor.getAllValues()).extracting(AssistantMessage::getRole).containsExactly("USER", "ASSISTANT");
        assertThat(captor.getAllValues().get(0).getContent()).isEqualTo("How is my protein?");
        assertThat(captor.getAllValues().get(1).getContent()).isEqualTo("You have 40 g remaining.");
    }

    @Test void theStoredAnswerCarriesTheFullPayloadForRedrawing() throws Exception {
        var captor = ArgumentCaptor.forClass(AssistantMessage.class);
        service.ask(EMAIL, "How is my protein?", null);

        verify(messages, times(2)).save(captor.capture());
        String payload = captor.getAllValues().get(1).getPayload();
        assertThat(payload).isNotNull();
        var restored = mapper.readValue(payload, PulseAssistantService.PulseAnswer.class);
        assertThat(restored.title()).isEqualTo("Protein today");
        assertThat(restored.evidence()).containsExactly("40 g remaining");
    }

    // 5. A reopened conversation redraws from the stored payload.

    @Test void reopeningAConversationRestoresTheRenderedAnswer() throws Exception {
        var stored = new PulseAssistantService.PulseAnswer("Protein today", "You have 40 g remaining.",
            List.of("40 g remaining"), List.of(), "disclaimer", true, null);
        AssistantMessage assistant = message("ASSISTANT", "You have 40 g remaining.");
        assistant.setPayload(mapper.writeValueAsString(stored));
        when(conversations.findByIdAndUserId(7L, 1L)).thenReturn(Optional.of(conversation));
        when(messages.findByConversationIdOrderByCreatedAtAsc(7L))
            .thenReturn(List.of(message("USER", "How is my protein?"), assistant));

        var detail = service.conversation(EMAIL, 7L);

        assertThat(detail.messages()).hasSize(2);
        assertThat(detail.messages().get(0).answer()).isNull();
        assertThat(detail.messages().get(1).answer().title()).isEqualTo("Protein today");
    }

    // 6. Ownership: a conversation id from the client is never trusted on its own.

    @Test void anotherUsersConversationCannotBeContinued() {
        when(conversations.findByIdAndUserId(7L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.ask(OTHER, "And my protein target?", 7L))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("not found");
        verify(messages, never()).save(any());
    }

    @Test void anotherUsersConversationCannotBeRead() {
        when(conversations.findByIdAndUserId(7L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.conversation(OTHER, 7L)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void anotherUsersConversationCannotBeDeleted() {
        when(conversations.findByIdAndUserId(7L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteConversation(OTHER, 7L)).isInstanceOf(IllegalArgumentException.class);
        verify(conversations, never()).delete(any());
    }

    // 7. Deletion actually removes the rows.

    @Test void deletingAConversationRemovesItsMessagesToo() {
        when(conversations.findByIdAndUserId(7L, 1L)).thenReturn(Optional.of(conversation));

        service.deleteConversation(EMAIL, 7L);

        verify(messages).deleteByConversationId(7L);
        verify(conversations).delete(conversation);
    }

    @Test void deletingEverythingCoversMoreThanTheNewestPage() {
        AssistantConversation older = new AssistantConversation(); older.setId(8L); older.setUser(user);
        when(conversations.findByUserId(1L)).thenReturn(List.of(conversation, older));

        service.deleteAllConversations(EMAIL);

        verify(messages).deleteByConversationId(7L);
        verify(messages).deleteByConversationId(8L);
        verify(conversations).deleteByUserId(1L);
        verify(conversations, never()).findTop30ByUserIdOrderByLastMessageAtDesc(any());
    }

    private AssistantMessage message(String role, String content) {
        AssistantMessage message = new AssistantMessage();
        message.setId((long) content.hashCode());
        message.setRole(role);
        message.setContent(content);
        return message;
    }
}
