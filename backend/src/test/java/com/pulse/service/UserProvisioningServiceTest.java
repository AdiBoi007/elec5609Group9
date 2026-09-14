package com.pulse.service;

import com.pulse.config.PrivacyVersions;
import com.pulse.entity.User;
import com.pulse.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserProvisioningServiceTest {
    private UserRepository users;
    private UserProvisioningService service;

    @BeforeEach void setUp() {
        users = mock(UserRepository.class);
        service = new UserProvisioningService(users);
    }

    @Test void recordsConsentWhenSignUpMetadataCarriesTheCurrentVersion() {
        Instant before = Instant.now();

        User saved = provision(Map.of("name", "New User", "privacyNoticeVersion", PrivacyVersions.PRIVACY_NOTICE));

        assertThat(saved.getName()).isEqualTo("New User");
        assertThat(saved.getProfile().getPrivacyNoticeVersion()).isEqualTo(PrivacyVersions.PRIVACY_NOTICE);
        assertThat(saved.getProfile().getPrivacyAcceptedAt()).isAfterOrEqualTo(before);
    }

    @Test void ignoresAnOlderVersion() {
        User saved = provision(Map.of("privacyNoticeVersion", "2000-01-01"));

        assertThat(saved.getProfile().getPrivacyNoticeVersion()).isNull();
        assertThat(saved.getProfile().getPrivacyAcceptedAt()).isNull();
    }

    @Test void recordsNoConsentWithoutMetadata() {
        User saved = provision(null);

        assertThat(saved.getName()).isEqualTo("new.user");
        assertThat(saved.getProfile().getPrivacyNoticeVersion()).isNull();
        assertThat(saved.getProfile().getPrivacyAcceptedAt()).isNull();
        assertThat(saved.getProfile().getAiConsentAt()).as("sign-up never implies AI consent").isNull();
    }

    @Test void leavesExistingAccountsUntouched() {
        when(users.existsByEmailIgnoreCase("new.user@example.com")).thenReturn(true);

        service.provision(jwt(Map.of("privacyNoticeVersion", PrivacyVersions.PRIVACY_NOTICE)));

        verify(users, never()).save(any());
    }

    private User provision(Map<String, Object> metadata) {
        service.provision(jwt(metadata));
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(users).save(captor.capture());
        return captor.getValue();
    }

    private Jwt jwt(Map<String, Object> metadata) {
        Jwt.Builder builder = Jwt.withTokenValue("token").header("alg", "ES256").claim("email", "New.User@example.com");
        if (metadata != null) builder.claim("user_metadata", metadata);
        return builder.build();
    }
}
