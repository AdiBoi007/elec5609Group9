package com.pulse.service;

import com.pulse.dto.DietaryProfileDtos.DietaryProfileUpdate;
import com.pulse.entity.UserProfile;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DietaryProfileServiceTest {
    private final DietaryProfileService service = new DietaryProfileService();

    @Test void updatesAndReturnsStructuredPreferences() {
        UserProfile profile = new UserProfile();
        service.update(profile, request("VEGETARIAN", Set.of("NO_EGGS"), Set.of("PEANUTS")));

        var result = service.response(profile);
        assertThat(result.dietaryPattern()).isEqualTo("VEGETARIAN");
        assertThat(result.restrictions()).containsExactly("NO_EGGS");
        assertThat(result.allergies()).containsExactly("PEANUTS");
        assertThat(result.preferredProteinSources()).contains("TOFU", "LENTILS");
        assertThat(service.summary(profile)).contains("Vegetarian", "No eggs", "Peanuts allergy");
    }

    @Test void rejectsUnsupportedEnumsAndBlankCustomPattern() {
        assertThatThrownBy(() -> service.update(new UserProfile(), request("VEGETARIAN", Set.of("NO_MAGIC"), Set.of())))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Unsupported restriction");
        DietaryProfileUpdate custom = new DietaryProfileUpdate("CUSTOM", "", Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), 3, "EASY", "MIN_15_30", "MODERATE");
        assertThatThrownBy(() -> service.update(new UserProfile(), custom)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("custom dietary pattern");
    }

    @Test void removesProteinSourcesThatConflictWithTheSavedProfile() {
        UserProfile profile = new UserProfile();
        DietaryProfileUpdate vegan = new DietaryProfileUpdate("VEGAN", "", Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of(), Set.of("CHICKEN", "DAIRY", "TOFU"), Set.of(), 3, "EASY", "MIN_15_30", "MODERATE");
        service.update(profile, vegan);
        assertThat(profile.getPreferredProteinSources()).containsExactly("TOFU");
        assertThat(service.input(profile).preferredProteinSources()).containsExactly("TOFU");
    }

    private DietaryProfileUpdate request(String pattern, Set<String> restrictions, Set<String> allergies) {
        return new DietaryProfileUpdate(pattern, "", restrictions, Set.of(), Set.of(), Set.of(), allergies, Set.of(), Set.of(), Set.of(), Set.of("Paneer"), Set.of("Olives"), Set.of("INDIAN"), Set.of("TOFU", "LENTILS"), Set.of(), 4, "EASY", "MIN_15_30", "MODERATE");
    }
}
