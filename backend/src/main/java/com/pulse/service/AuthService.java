package com.pulse.service;

import com.pulse.dto.AuthDtos.*;
import com.pulse.entity.*;
import com.pulse.repository.UserRepository;
import com.pulse.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (users.existsByEmailIgnoreCase(request.email())) throw new IllegalArgumentException("An account with this email already exists");
        User user = new User(); user.setName(request.name().trim()); user.setEmail(request.email().trim().toLowerCase()); user.setPasswordHash(passwordEncoder.encode(request.password()));
        UserProfile profile = new UserProfile(); profile.setUser(user); profile.setCalorieTarget(2200); profile.setProteinTarget(150); profile.setCarbTarget(250); profile.setFatTarget(70); profile.setHydrationTargetMl(2500); profile.setDietaryPattern(request.dietaryPattern()); profile.setCustomDietaryPattern(request.customDietaryPattern()); profile.setPreferredMealsPerDay(3); profile.setMealPrepDifficulty("EASY"); profile.setMealPrepTime("MIN_15_30"); profile.setBudgetPreference("MODERATE"); user.setProfile(profile);
        users.save(user);
        return new AuthResponse(jwtService.generateToken(user.getEmail()), user.getName(), user.getEmail());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        User user = users.findByEmailIgnoreCase(request.email()).orElseThrow(() -> new BadCredentialsException("Invalid credentials"));
        return new AuthResponse(jwtService.generateToken(user.getEmail()), user.getName(), user.getEmail());
    }
}
