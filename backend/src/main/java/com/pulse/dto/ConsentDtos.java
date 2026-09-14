package com.pulse.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class ConsentDtos {
    private ConsentDtos() {}

    /** The notice version the user is agreeing to; must match the server's current version. */
    public record ConsentRequest(@NotBlank @Size(max = 20) String version) {}

    /**
     * Current and accepted versions for both notices. Nulls are always serialised (the app
     * default omits them) so clients can tell "never accepted" from a missing field.
     */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record ConsentStatus(
        String currentNoticeVersion,
        String acceptedNoticeVersion,
        Instant acceptedAt,
        String currentAiVersion,
        String aiConsentVersion,
        Instant aiConsentAt) {}
}
