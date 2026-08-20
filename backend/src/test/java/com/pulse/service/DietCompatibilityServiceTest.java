package com.pulse.service;

import com.pulse.entity.Food;
import com.pulse.entity.UserProfile;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DietCompatibilityServiceTest {
    private final DietCompatibilityService service = new DietCompatibilityService();

    @Test void flagsAllergyFromAvailableMetadata() {
        UserProfile profile = profile("OMNIVORE"); profile.getAllergies().add("PEANUTS");
        Food food = food("Oats, roasted peanuts and cocoa", "en:peanuts", "");
        var result = service.evaluate(profile, food);
        assertThat(result.status()).isEqualTo("CONFLICT");
        assertThat(result.warnings()).anyMatch(value -> value.contains("allergy"));
    }

    @Test void flagsPatternAndCulturalConflictsWithoutClaimingCertification() {
        UserProfile vegan = profile("VEGAN");
        assertThat(service.evaluate(vegan, food("Milk, cocoa", "en:milk", "en:non-vegan")).status()).isEqualTo("CONFLICT");
        UserProfile halal = profile("OMNIVORE"); halal.getCulturalPreferences().add("HALAL");
        assertThat(service.evaluate(halal, food("Pork, salt", "", "")).warnings()).anyMatch(value -> value.contains("certification was not verified"));
    }

    @Test void returnsUnknownWhenIngredientMetadataIsMissing() {
        var result = service.evaluate(profile("VEGETARIAN"), food("", "", ""));
        assertThat(result.status()).isEqualTo("UNKNOWN");
        assertThat(result.metadataAvailable()).isFalse();
    }

    private UserProfile profile(String pattern) { UserProfile profile = new UserProfile(); profile.setDietaryPattern(pattern); return profile; }
    private Food food(String ingredients, String allergens, String tags) { Food food = new Food(); food.setIngredientsText(ingredients); food.setAllergenTags(allergens); food.setDietaryTags(tags); return food; }
}
