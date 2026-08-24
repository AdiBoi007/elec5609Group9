package com.pulse.service;

import com.pulse.entity.User;
import com.pulse.entity.UserProfile;
import com.pulse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserProvisioningService {
    private final UserRepository users;

    @Transactional
    public void provision(Jwt jwt) {
        String email = jwt.getClaimAsString("email").toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) return;
        String name = displayName(jwt, email);

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(null);

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setCalorieTarget(2200);
        profile.setProteinTarget(150);
        profile.setCarbTarget(250);
        profile.setFatTarget(70);
        profile.setHydrationTargetMl(2500);
        profile.setDietaryPattern("OMNIVORE");
        profile.setPreferredMealsPerDay(3);
        profile.setMealPrepDifficulty("EASY");
        profile.setMealPrepTime("MIN_15_30");
        profile.setBudgetPreference("MODERATE");
        user.setProfile(profile);

        users.save(user);
    }

    private String displayName(Jwt jwt, String email) {
        Object metadata = jwt.getClaim("user_metadata");
        if (metadata instanceof Map<?, ?> values && values.get("name") != null) {
            return values.get("name").toString();
        }
        return email.substring(0, email.indexOf('@'));
    }
}
