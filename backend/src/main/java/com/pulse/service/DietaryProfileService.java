package com.pulse.service;

import com.pulse.dto.DietaryProfileDtos.*;
import com.pulse.entity.UserProfile;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class DietaryProfileService {
    private static final Set<String> RESTRICTIONS = Set.of("NO_BEEF", "NO_PORK", "NO_POULTRY", "NO_RED_MEAT", "NO_SEAFOOD", "NO_EGGS", "DAIRY_FREE", "GLUTEN_FREE", "NUT_FREE", "SOY_FREE");
    private static final Set<String> CULTURAL = Set.of("HALAL", "KOSHER", "JAIN", "CUSTOM");
    private static final Set<String> ALLERGIES = Set.of("PEANUTS", "TREE_NUTS", "MILK", "EGGS", "WHEAT", "SOY", "FISH", "SHELLFISH", "SESAME");
    private static final Set<String> INTOLERANCES = Set.of("LACTOSE", "GLUTEN");

    public void update(UserProfile profile, DietaryProfileUpdate request) {
        validate(request.restrictions(), RESTRICTIONS, "restriction");
        validate(request.culturalPreferences(), CULTURAL, "cultural preference");
        validate(request.allergies(), ALLERGIES, "allergy");
        validate(request.intolerances(), INTOLERANCES, "intolerance");
        if ("CUSTOM".equals(request.dietaryPattern()) && clean(request.customDietaryPattern()).isEmpty())
            throw new IllegalArgumentException("Describe your custom dietary pattern");
        profile.setDietaryPattern(request.dietaryPattern());
        profile.setCustomDietaryPattern(clean(request.customDietaryPattern()));
        replace(profile.getRestrictions(), request.restrictions());
        replace(profile.getCustomExclusions(), request.customExclusions());
        replace(profile.getCulturalPreferences(), request.culturalPreferences());
        replace(profile.getCustomCulturalPreferences(), request.customCulturalPreferences());
        replace(profile.getAllergies(), request.allergies());
        replace(profile.getCustomAllergies(), request.customAllergies());
        replace(profile.getIntolerances(), request.intolerances());
        replace(profile.getCustomIntolerances(), request.customIntolerances());
        replace(profile.getFavouriteFoods(), request.favouriteFoods());
        replace(profile.getDislikedFoods(), request.dislikedFoods());
        replace(profile.getPreferredCuisines(), request.preferredCuisines());
        replace(profile.getPreferredProteinSources(), request.preferredProteinSources());
        replace(profile.getCustomProteinSources(), request.customProteinSources());
        profile.getPreferredProteinSources().removeIf(source -> !compatibleProtein(profile, source));
        profile.getCustomProteinSources().removeIf(source -> !compatibleProtein(profile, source));
        profile.setPreferredMealsPerDay(request.preferredMealsPerDay());
        profile.setMealPrepDifficulty(request.mealPrepDifficulty());
        profile.setMealPrepTime(request.mealPrepTime());
        profile.setBudgetPreference(request.budgetPreference());
        profile.setDietaryPreferences(summary(profile));
        profile.setDislikedIngredients(String.join(", ", profile.getDislikedFoods()));
    }

    public DietaryProfileResponse response(UserProfile p) {
        return new DietaryProfileResponse(value(p.getDietaryPattern(), "OMNIVORE"), value(p.getCustomDietaryPattern(), ""), copy(p.getRestrictions()), copy(p.getCustomExclusions()),
            copy(p.getCulturalPreferences()), copy(p.getCustomCulturalPreferences()), copy(p.getAllergies()), copy(p.getCustomAllergies()), copy(p.getIntolerances()), copy(p.getCustomIntolerances()),
            copy(p.getFavouriteFoods()), copy(p.getDislikedFoods()), copy(p.getPreferredCuisines()), copy(p.getPreferredProteinSources()), copy(p.getCustomProteinSources()),
            p.getPreferredMealsPerDay() == null ? 3 : p.getPreferredMealsPerDay(), value(p.getMealPrepDifficulty(), "EASY"), value(p.getMealPrepTime(), "MIN_15_30"), value(p.getBudgetPreference(), "MODERATE"));
    }

    public DietaryProfileInput input(UserProfile p) {
        DietaryProfileResponse r = response(p);
        Set<String> exclusions = union(r.customExclusions(), r.customCulturalPreferences());
        Set<String> allergies = union(r.allergies(), r.customAllergies());
        Set<String> intolerances = union(r.intolerances(), r.customIntolerances());
        Set<String> proteins = union(r.preferredProteinSources(), r.customProteinSources());
        proteins.removeIf(source -> !compatibleProtein(p, source));
        return new DietaryProfileInput(r.dietaryPattern(), r.customDietaryPattern(), r.restrictions(), exclusions,
            r.culturalPreferences(), allergies, intolerances, r.favouriteFoods(), r.dislikedFoods(), r.preferredCuisines(), proteins,
            r.preferredMealsPerDay(), r.mealPrepDifficulty(), r.mealPrepTime(), r.budgetPreference());
    }

    public String summary(UserProfile p) {
        List<String> values = new ArrayList<>();
        values.add(label(value(p.getDietaryPattern(), "OMNIVORE")));
        p.getRestrictions().forEach(item -> values.add(label(item)));
        p.getAllergies().forEach(item -> values.add(label(item) + " allergy"));
        return String.join(" • ", values);
    }

    private void validate(Set<String> values, Set<String> allowed, String name) { if (values != null) for (String value : values) if (!allowed.contains(value)) throw new IllegalArgumentException("Unsupported " + name + ": " + value); }
    private void replace(Set<String> target, Set<String> values) { target.clear(); if (values != null) values.stream().map(this::clean).filter(value -> !value.isEmpty()).forEach(target::add); }
    private Set<String> copy(Set<String> values) { return values == null ? Set.of() : Collections.unmodifiableSet(new LinkedHashSet<>(values)); }
    private Set<String> union(Set<String> first, Set<String> second) { Set<String> result = new LinkedHashSet<>(first); result.addAll(second); return result; }
    private String clean(String value) { return value == null ? "" : value.trim(); }
    private String value(String value, String fallback) { return value == null || value.isBlank() ? fallback : value; }
    private String label(String value) { String normalized = value.toLowerCase(Locale.ROOT).replace('_', ' '); return Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1); }
    private boolean compatibleProtein(UserProfile profile, String source) {
        String value = source.toUpperCase(Locale.ROOT).replace(' ', '_');
        String pattern = value(profile.getDietaryPattern(), "OMNIVORE");
        if (pattern.equals("VEGAN") && contains(value, "CHICKEN", "BEEF", "FISH", "EGG", "DAIRY", "MILK", "WHEY")) return false;
        if ((pattern.equals("VEGETARIAN") || pattern.equals("EGGETARIAN")) && contains(value, "CHICKEN", "BEEF", "FISH")) return false;
        if (pattern.equals("PESCATARIAN") && contains(value, "CHICKEN", "BEEF")) return false;
        Set<String> restrictions = profile.getRestrictions(); Set<String> allergies = profile.getAllergies();
        if (restrictions.contains("NO_POULTRY") && value.contains("CHICKEN")) return false;
        if ((restrictions.contains("NO_BEEF") || restrictions.contains("NO_RED_MEAT")) && value.contains("BEEF")) return false;
        if (restrictions.contains("NO_SEAFOOD") && value.contains("FISH")) return false;
        if ((restrictions.contains("NO_EGGS") || allergies.contains("EGGS")) && value.contains("EGG")) return false;
        if ((restrictions.contains("DAIRY_FREE") || allergies.contains("MILK") || profile.getIntolerances().contains("LACTOSE")) && contains(value, "DAIRY", "MILK", "WHEY")) return false;
        if ((restrictions.contains("SOY_FREE") || allergies.contains("SOY")) && contains(value, "TOFU", "TEMPEH", "SOY")) return false;
        if ((restrictions.contains("GLUTEN_FREE") || allergies.contains("WHEAT") || profile.getIntolerances().contains("GLUTEN")) && value.contains("SEITAN")) return false;
        if (allergies.contains("FISH") && value.contains("FISH")) return false;
        return !profile.getCulturalPreferences().contains("JAIN") || !contains(value, "CHICKEN", "BEEF", "FISH", "EGG");
    }
    private boolean contains(String value, String... terms) { return Arrays.stream(terms).anyMatch(value::contains); }
}
