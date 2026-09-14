package com.pulse.controller;

import com.pulse.config.PrivacyVersions;
import com.pulse.entity.User;
import com.pulse.entity.UserProfile;
import com.pulse.exception.GlobalExceptionHandler;
import com.pulse.repository.UserRepository;
import com.pulse.service.ConsentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ConsentControllerTest {
    private static final String EMAIL = "user@example.com";
    private final TestingAuthenticationToken auth = new TestingAuthenticationToken(EMAIL, null, "ROLE_USER");

    private UserProfile profile;
    private MockMvc mvc;

    @BeforeEach void setUp() {
        UserRepository users = mock(UserRepository.class);
        User user = new User(); user.setId(1L); user.setEmail(EMAIL);
        profile = new UserProfile(); profile.setUser(user); user.setProfile(profile);
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));
        mvc = MockMvcBuilders.standaloneSetup(new ConsentController(new ConsentService(users)))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test void acceptingPrivacyReturnsStatusWithExplicitNullsForAi() throws Exception {
        mvc.perform(put("/api/consent/privacy").principal(auth).contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":\"" + PrivacyVersions.PRIVACY_NOTICE + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.currentNoticeVersion").value(PrivacyVersions.PRIVACY_NOTICE))
            .andExpect(jsonPath("$.acceptedNoticeVersion").value(PrivacyVersions.PRIVACY_NOTICE))
            .andExpect(jsonPath("$.acceptedAt").exists())
            .andExpect(jsonPath("$.aiConsentVersion").value((Object) null))
            .andExpect(jsonPath("$.aiConsentAt").value((Object) null));
    }

    @Test void grantThenRevokeAiConsent() throws Exception {
        mvc.perform(put("/api/consent/ai").principal(auth).contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":\"" + PrivacyVersions.AI_NOTICE + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.aiConsentVersion").value(PrivacyVersions.AI_NOTICE));

        mvc.perform(delete("/api/consent/ai").principal(auth)).andExpect(status().isNoContent());
        assertThat(profile.getAiConsentAt()).isNull();
    }

    @Test void staleVersionReturns400() throws Exception {
        mvc.perform(put("/api/consent/privacy").principal(auth).contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":\"2000-01-01\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400));
        assertThat(profile.getPrivacyNoticeVersion()).isNull();
    }

    @Test void missingVersionFailsValidation() throws Exception {
        mvc.perform(put("/api/consent/ai").principal(auth).contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fieldErrors.version").exists());
    }
}
