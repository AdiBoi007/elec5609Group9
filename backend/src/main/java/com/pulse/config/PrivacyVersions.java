package com.pulse.config;

/**
 * Versions of the user-facing notices that consent is recorded against. Bump a value
 * whenever the wording of that notice changes materially: every stored consent for an
 * older version stops counting, so users are asked again. The frontend keeps the same
 * values in {@code src/content/privacy.ts}; change both together.
 */
public final class PrivacyVersions {
    /** Privacy Policy and data collection notice. */
    public static final String PRIVACY_NOTICE = "2026-09-13";
    /** Notice describing what AI features send to OpenAI. */
    public static final String AI_NOTICE = "2026-09-13";

    private PrivacyVersions() {}
}
