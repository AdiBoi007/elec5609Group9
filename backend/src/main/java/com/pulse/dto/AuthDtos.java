package com.pulse.dto;

import jakarta.validation.constraints.*;

public final class AuthDtos {
    private AuthDtos() {}
    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record RegisterRequest(@NotBlank @Size(max = 100) String name, @Email @NotBlank String email, @Size(min = 8, max = 100) String password,
        @NotBlank @Pattern(regexp = "OMNIVORE|VEGETARIAN|VEGAN|PESCATARIAN|EGGETARIAN|FLEXITARIAN|CUSTOM") String dietaryPattern,
        @Size(max = 200) String customDietaryPattern) {}
    public record AuthResponse(String token, String name, String email) {}
}
