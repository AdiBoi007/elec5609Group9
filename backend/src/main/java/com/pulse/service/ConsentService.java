package com.pulse.service;

import com.pulse.config.PrivacyVersions;
import com.pulse.dto.ConsentDtos.ConsentStatus;
import com.pulse.entity.User;
import com.pulse.entity.UserProfile;
import com.pulse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Records a user's acceptance of the Privacy Policy and the AI data notice. Consent is
 * always resolved from the authenticated account and only counts for the notice version
 * currently in force.
 */
@Service
@RequiredArgsConstructor
public class ConsentService {
    private final UserRepository users;

    @Transactional
    public ConsentStatus acceptPrivacy(String email, String version) {
        requireCurrent(version, PrivacyVersions.PRIVACY_NOTICE, "Privacy Policy");
        UserProfile profile = profile(email);
        profile.setPrivacyNoticeVersion(PrivacyVersions.PRIVACY_NOTICE);
        profile.setPrivacyAcceptedAt(Instant.now());
        return status(profile);
    }

    @Transactional
    public ConsentStatus grantAi(String email, String version) {
        requireCurrent(version, PrivacyVersions.AI_NOTICE, "AI notice");
        UserProfile profile = profile(email);
        profile.setAiConsentVersion(PrivacyVersions.AI_NOTICE);
        profile.setAiConsentAt(Instant.now());
        return status(profile);
    }

    @Transactional
    public void revokeAi(String email) {
        UserProfile profile = profile(email);
        profile.setAiConsentVersion(null);
        profile.setAiConsentAt(null);
    }

    public ConsentStatus status(UserProfile profile) {
        return new ConsentStatus(
            PrivacyVersions.PRIVACY_NOTICE,
            profile == null ? null : profile.getPrivacyNoticeVersion(),
            profile == null ? null : profile.getPrivacyAcceptedAt(),
            PrivacyVersions.AI_NOTICE,
            profile == null ? null : profile.getAiConsentVersion(),
            profile == null ? null : profile.getAiConsentAt());
    }

    /** True only when the user has agreed to the AI notice version currently in force. */
    public boolean aiAllowed(User user) {
        UserProfile profile = user == null ? null : user.getProfile();
        return profile != null
            && profile.getAiConsentAt() != null
            && PrivacyVersions.AI_NOTICE.equals(profile.getAiConsentVersion());
    }

    private UserProfile profile(String email) {
        UserProfile profile = users.findByEmailIgnoreCase(email).orElseThrow().getProfile();
        if (profile == null) throw new IllegalArgumentException("Profile not found");
        return profile;
    }

    // Accepting a stale version would record consent to wording the user never saw.
    private void requireCurrent(String version, String current, String notice) {
        if (!current.equals(version)) {
            throw new IllegalArgumentException("The " + notice + " has been updated. Reload the page and review the latest version.");
        }
    }
}
