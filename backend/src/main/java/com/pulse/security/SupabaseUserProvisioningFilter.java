package com.pulse.security;

import com.pulse.repository.UserRepository;
import com.pulse.service.UserProvisioningService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.oauth2.jwt.Jwt;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class SupabaseUserProvisioningFilter extends OncePerRequestFilter {
    private final UserRepository users;
    private final UserProvisioningService provisioning;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
                                    FilterChain chain) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            if (email != null && !users.existsByEmailIgnoreCase(email)) {
                provisioning.provision(jwt);
            }
        }
        chain.doFilter(req, res);
    }
}
