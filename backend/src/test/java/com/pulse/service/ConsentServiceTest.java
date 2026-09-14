package com.pulse.service;

import com.pulse.config.PrivacyVersions;
import com.pulse.entity.User;
import com.pulse.entity.UserProfile;
import com.pulse.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ConsentServiceTest {
    private static final String EMAIL = "user@example.com";

    private UserRepository users;
    private ConsentService service;
    private User user;
    private UserProfile profile;

    @BeforeEach void setUp() {
        users = mock(UserRepository.class);
        service = new ConsentService(users);
        user = new User(); user.setId(1L); user.setEmail(EMAIL);
        profile = new UserProfile(); profile.setUser(user); user.setProfile(profile);
        when(users.findByEmailIgnoreCase(EMAIL)).thenReturn(Optional.of(user));
    }

    @Test void newProfileHasNoConsentButReportsCurrentVersions() {
        var status = service.status(profile);

        assertThat(status.currentNoticeVersion()).isEqualTo(PrivacyVersions.PRIVACY_NOTICE);
        assertThat(status.currentAiVersion()).isEqualTo(PrivacyVersions.AI_NOTICE);
        assertThat(status.acceptedNoticeVersion()).isNull();
        assertThat(status.acceptedAt()).isNull();
        assertThat(status.aiConsentVersion()).isNull();
        assertThat(status.aiConsentAt()).isNull();
        assertThat(service.aiAllowed(user)).isFalse();
    }

    @Test void acceptingPrivacyRecordsCurrentVersionAndTime() {
        Instant before = Instant.now();

        var status = service.acceptPrivacy(EMAIL, PrivacyVersions.PRIVACY_NOTICE);

        assertThat(profile.getPrivacyNoticeVersion()).isEqualTo(PrivacyVersions.PRIVACY_NOTICE);
        assertThat(profile.getPrivacyAcceptedAt()).isAfterOrEqualTo(before);
        assertThat(status.acceptedNoticeVersion()).isEqualTo(PrivacyVersions.PRIVACY_NOTICE);
        assertThat(status.acceptedAt()).isEqualTo(profile.getPrivacyAcceptedAt());
        assertThat(service.aiAllowed(user)).as("privacy consent must not imply AI consent").isFalse();
    }

    @Test void grantingAiConsentAllowsAiAndRevokingClearsIt() {
        service.grantAi(EMAIL, PrivacyVersions.AI_NOTICE);
        assertThat(profile.getAiConsentVersion()).isEqualTo(PrivacyVersions.AI_NOTICE);
        assertThat(profile.getAiConsentAt()).isNotNull();
        assertThat(service.aiAllowed(user)).isTrue();

        service.revokeAi(EMAIL);
        assertThat(profile.getAiConsentVersion()).isNull();
        assertThat(profile.getAiConsentAt()).isNull();
        assertThat(service.aiAllowed(user)).isFalse();
    }

    @Test void staleOrMissingVersionIsRejectedWithoutTouchingTheProfile() {
        assertThatThrownBy(() -> service.acceptPrivacy(EMAIL, "2000-01-01"))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Privacy Policy");
        assertThatThrownBy(() -> service.grantAi(EMAIL, null))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("AI notice");

        assertThat(profile.getPrivacyNoticeVersion()).isNull();
        assertThat(profile.getPrivacyAcceptedAt()).isNull();
        assertThat(profile.getAiConsentVersion()).isNull();
        assertThat(profile.getAiConsentAt()).isNull();
        verify(users, never()).findByEmailIgnoreCase(anyString());
    }

    @Test void consentToAnOlderAiNoticeNoLongerCounts() {
        profile.setAiConsentVersion("2000-01-01");
        profile.setAiConsentAt(Instant.parse("2026-01-01T00:00:00Z"));

        assertThat(service.aiAllowed(user)).isFalse();
        assertThat(service.status(profile).aiConsentVersion()).isEqualTo("2000-01-01");
    }

    @Test void userWithoutProfileIsNeverAllowedAi() {
        User bare = new User();
        assertThat(service.aiAllowed(bare)).isFalse();
        assertThat(service.aiAllowed(null)).isFalse();
    }
}
