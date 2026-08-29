package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Getter @Setter @NoArgsConstructor
public class UserProfile extends BaseEntity {
    @OneToOne(optional = false) @JoinColumn(name = "user_id", unique = true) private User user;
    private Integer age;
    private String gender;
    private Double heightCm;
    private Double weightKg;
    private String activityLevel;
    @Convert(converter = FitnessGoalConverter.class) private FitnessGoal fitnessGoal;
    private Integer calorieTarget;
    private Integer proteinTarget;
    private Integer carbTarget;
    private Integer fatTarget;
    private Integer hydrationTargetMl;
    @Column(length = 1000) private String dietaryPreferences;
    @Column(length = 1000) private String dislikedIngredients;
    @Column(length = 40) private String dietaryPattern;
    @Column(length = 200) private String customDietaryPattern;
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_dietary_restrictions", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "restriction") private Set<String> restrictions = new LinkedHashSet<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_custom_exclusions", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "exclusion") private Set<String> customExclusions = new LinkedHashSet<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_cultural_preferences", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "preference") private Set<String> culturalPreferences = new LinkedHashSet<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_custom_cultural_preferences", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "preference") private Set<String> customCulturalPreferences = new LinkedHashSet<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_food_allergies", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "allergy") private Set<String> allergies = new LinkedHashSet<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_custom_allergies", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "allergy") private Set<String> customAllergies = new LinkedHashSet<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_food_intolerances", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "intolerance") private Set<String> intolerances = new LinkedHashSet<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_custom_intolerances", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "intolerance") private Set<String> customIntolerances = new LinkedHashSet<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_favourite_foods", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "food") private Set<String> favouriteFoods = new LinkedHashSet<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_disliked_foods", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "food") private Set<String> dislikedFoods = new LinkedHashSet<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_preferred_cuisines", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "cuisine") private Set<String> preferredCuisines = new LinkedHashSet<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_preferred_proteins", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "protein_source") private Set<String> preferredProteinSources = new LinkedHashSet<>();
    @ElementCollection(fetch = FetchType.EAGER) @CollectionTable(name = "profile_custom_proteins", joinColumns = @JoinColumn(name = "profile_id")) @Column(name = "protein_source") private Set<String> customProteinSources = new LinkedHashSet<>();
    private Integer preferredMealsPerDay;
    @Column(length = 30) private String mealPrepDifficulty;
    @Column(length = 30) private String mealPrepTime;
    @Column(length = 30) private String budgetPreference;
}
