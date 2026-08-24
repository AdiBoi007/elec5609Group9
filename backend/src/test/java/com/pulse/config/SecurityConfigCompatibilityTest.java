package com.pulse.config;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecurityConfigCompatibilityTest {
    @Test
    void exposesLegacyAuthenticationBeansDuringSupabaseMigration() throws Exception {
        assertNotNull(SecurityConfig.class.getDeclaredMethod("passwordEncoder").getAnnotation(Bean.class));
        assertNotNull(SecurityConfig.class
                .getDeclaredMethod("authenticationManager",
                        org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration.class)
                .getAnnotation(Bean.class));

        PasswordEncoder encoder = new SecurityConfig().passwordEncoder();
        assertTrue(encoder.matches("password123", encoder.encode("password123")));
    }
}
