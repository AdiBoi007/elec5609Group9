package com.pulse.service;

import com.pulse.dto.DietaryProfileDtos.DietCompatibility;
import com.pulse.entity.Food;
import com.pulse.entity.UserProfile;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class DietCompatibilityService {
    public DietCompatibility evaluate(UserProfile profile, Food food) {
        if (profile == null) return unknown();
        String ingredients = value(food.getIngredientsText()).toLowerCase(Locale.ROOT);
        String allergens = value(food.getAllergenTags()).toLowerCase(Locale.ROOT).replace("en:", "").replace('-', ' ');
        String dietTags = value(food.getDietaryTags()).toLowerCase(Locale.ROOT);
        boolean metadata = !ingredients.isBlank() || !allergens.isBlank() || !dietTags.isBlank();
        if (!metadata) return unknown();
        List<String> warnings = new ArrayList<>();
        Set<String> allergyTerms = new LinkedHashSet<>(profile.getAllergies()); allergyTerms.addAll(profile.getCustomAllergies());
        for (String allergy : allergyTerms) if (matches(allergens + " " + ingredients, allergy)) warnings.add("Contains " + label(allergy) + " (allergy)");
        Set<String> exclusions = new LinkedHashSet<>(profile.getRestrictions()); exclusions.addAll(profile.getCustomExclusions());
        for (String exclusion : exclusions) if (conflicts(exclusion, ingredients, allergens)) warnings.add("Contains an excluded ingredient: " + label(exclusion));
        String pattern = value(profile.getDietaryPattern()).toUpperCase(Locale.ROOT);
        if (pattern.equals("VEGAN") && (dietTags.contains("non-vegan") || containsAny(ingredients, "milk", "cheese", "yoghurt", "yogurt", "egg", "chicken", "beef", "pork", "fish", "gelatin"))) warnings.add("May conflict with your vegan preference");
        if ((pattern.equals("VEGETARIAN") || pattern.equals("EGGETARIAN")) && (dietTags.contains("non-vegetarian") || containsAny(ingredients, "chicken", "beef", "pork", "fish", "gelatin"))) warnings.add("May conflict with your vegetarian preference");
        if (pattern.equals("PESCATARIAN") && containsAny(ingredients, "chicken", "beef", "pork", "lamb")) warnings.add("May conflict with your pescatarian preference");
        if (profile.getCulturalPreferences().contains("HALAL") && containsAny(ingredients, "pork", "ham", "bacon")) warnings.add("May conflict with your halal preference; certification was not verified");
        if (profile.getCulturalPreferences().contains("KOSHER") && containsAny(ingredients, "pork", "ham", "bacon", "shellfish", "prawn", "shrimp")) warnings.add("May conflict with your kosher preference; certification was not verified");
        if (profile.getCulturalPreferences().contains("JAIN") && containsAny(ingredients, "onion", "garlic", "potato", "carrot", "beetroot", "egg", "meat", "fish")) warnings.add("May conflict with your Jain dietary preference");
        List<String> unique = warnings.stream().distinct().toList();
        return new DietCompatibility(unique.isEmpty() ? "COMPATIBLE" : "CONFLICT", true, unique);
    }

    public DietCompatibility combine(List<DietCompatibility> values) {
        List<String> warnings = values.stream().flatMap(value -> value.warnings().stream()).distinct().toList();
        if (!warnings.isEmpty()) return new DietCompatibility("CONFLICT", true, warnings);
        if (values.isEmpty() || values.stream().anyMatch(value -> !value.metadataAvailable())) return unknown();
        return new DietCompatibility("COMPATIBLE", true, List.of());
    }

    private boolean conflicts(String exclusion, String ingredients, String allergens) {
        String value = exclusion.toLowerCase(Locale.ROOT).replace('_', ' ');
        String source = ingredients + " " + allergens;
        if (value.equals("no beef") || value.equals("no red meat")) return containsAny(source, "beef", "lamb");
        if (value.equals("no pork")) return containsAny(source, "pork", "ham", "bacon");
        if (value.equals("no poultry")) return containsAny(source, "chicken", "turkey", "poultry");
        if (value.equals("no seafood")) return containsAny(source, "fish", "salmon", "tuna", "shellfish", "prawn", "shrimp");
        if (value.equals("no eggs")) return containsAny(source, "egg");
        if (value.equals("dairy free")) return containsAny(source, "milk", "dairy", "cheese", "yoghurt", "yogurt", "whey");
        if (value.equals("gluten free")) return containsAny(source, "wheat", "gluten", "barley", "rye");
        if (value.equals("nut free")) return containsAny(source, "peanut", "almond", "cashew", "walnut", "hazelnut", "tree nut");
        if (value.equals("soy free")) return containsAny(source, "soy", "tofu", "tempeh");
        return source.contains(value.replace("no ", ""));
    }
    private boolean matches(String source, String tag) {
        String value = tag.toLowerCase(Locale.ROOT).replace('_', ' ');
        return switch (value) {
            case "peanuts" -> containsAny(source, "peanut", "groundnut");
            case "tree nuts" -> containsAny(source, "tree nut", "almond", "cashew", "walnut", "hazelnut", "pistachio", "pecan");
            case "milk" -> containsAny(source, "milk", "dairy", "cheese", "yoghurt", "yogurt", "whey", "casein");
            case "eggs" -> containsAny(source, "egg", "albumen");
            case "wheat" -> containsAny(source, "wheat", "gluten");
            case "soy" -> containsAny(source, "soy", "soya", "tofu", "tempeh");
            case "fish" -> containsAny(source, "fish", "salmon", "tuna", "cod");
            case "shellfish" -> containsAny(source, "shellfish", "prawn", "shrimp", "crab", "lobster");
            default -> source.contains(value);
        };
    }
    private boolean containsAny(String value, String... terms) { return Arrays.stream(terms).anyMatch(value::contains); }
    private String value(String value) { return value == null ? "" : value; }
    private String label(String value) { String normalized = value.toLowerCase(Locale.ROOT).replace('_', ' ').replace("no ", ""); return normalized; }
    private DietCompatibility unknown() { return new DietCompatibility("UNKNOWN", false, List.of("Dietary compatibility could not be fully verified.")); }
}
