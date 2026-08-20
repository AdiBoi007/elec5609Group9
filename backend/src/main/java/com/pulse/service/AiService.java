package com.pulse.service;

import com.fasterxml.jackson.databind.*;
import com.pulse.dto.AiDtos.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.*;

@Service
public class AiService {
    private static final String DISCLAIMER = "General fitness guidance only. This is not medical advice or a diagnosis.";
    private final String apiKey;
    private final String model;
    private final ObjectMapper mapper;
    private final RestClient client;

    public AiService(@Value("${app.openai.api-key}") String apiKey, @Value("${app.openai.model}") String model, ObjectMapper mapper) {
        this.apiKey = apiKey; this.model = model; this.mapper = mapper;
        this.client = RestClient.builder().baseUrl("https://api.openai.com/v1").build();
    }

    public InsightResponse insights(InsightRequest request) {
        InsightResponse fallback = deterministicInsights(request);
        if (apiKey.isBlank()) return fallback;
        try {
            String input = "You are a concise fitness planning assistant. Never diagnose medical conditions. Analyse this user data and return ONLY JSON with keys summary, wins (array), attentionAreas (array), recommendations (array of 3 short strings). Data: " + mapper.writeValueAsString(request);
            JsonNode response = call(input); JsonNode parsed = mapper.readTree(extractText(response));
            return new InsightResponse(parsed.path("summary").asText(fallback.summary()), strings(parsed, "wins", fallback.wins()), strings(parsed, "attentionAreas", fallback.attentionAreas()), strings(parsed, "recommendations", fallback.recommendations()), DISCLAIMER, true);
        } catch (Exception ignored) { return fallback; }
    }

    public ChatText chat(String question, Map<String, Object> context, ChatText fallback) {
        if (apiKey.isBlank()) return fallback;
        try {
            String input = "You are Circle Health, a thoughtful fitness and nutrition assistant. Answer the user's exact question using only the supplied logged health data. Be specific, practical and encouraging. Explain patterns and trade-offs instead of merely repeating numbers. Never diagnose medical conditions and clearly acknowledge missing data. Return ONLY JSON with keys title, answer (2-5 concise sentences), and evidence (array of 3-5 short, data-specific points). Question: "
                + question + " Data: " + mapper.writeValueAsString(context);
            JsonNode parsed = mapper.readTree(extractText(call(input)));
            String title = parsed.path("title").asText(fallback.title()).trim();
            String answer = parsed.path("answer").asText(fallback.answer()).trim();
            List<String> evidence = strings(parsed, "evidence", fallback.evidence());
            if (title.isBlank() || answer.isBlank()) return fallback;
            return new ChatText(title, answer, evidence, true);
        } catch (Exception ignored) {
            return fallback;
        }
    }

    public WorkoutPlanResponse workoutPlan(WorkoutPlanRequest request) {
        WorkoutPlanResponse fallback = fallbackPlan(request);
        if (apiKey.isBlank()) return fallback;
        try {
            String input = "Create a safe non-medical workout plan. Return ONLY JSON with name, goal, summary, and days. Each day has name, focus, exercises; each exercise has name, sets, reps, restSeconds, notes. Inputs: " + mapper.writeValueAsString(request);
            JsonNode parsed = mapper.readTree(extractText(call(input)));
            List<WorkoutDay> days = new ArrayList<>();
            for (JsonNode day : parsed.path("days")) {
                List<WorkoutExercisePlan> exercises = new ArrayList<>();
                for (JsonNode exercise : day.path("exercises")) exercises.add(new WorkoutExercisePlan(exercise.path("name").asText(), exercise.path("sets").asInt(3), exercise.path("reps").asText("8-10"), exercise.path("restSeconds").asInt(90), exercise.path("notes").asText("Controlled tempo")));
                days.add(new WorkoutDay(day.path("name").asText(), day.path("focus").asText(), exercises));
            }
            return new WorkoutPlanResponse(parsed.path("name").asText(fallback.name()), parsed.path("goal").asText(request.fitnessGoal()), parsed.path("summary").asText(fallback.summary()), days.isEmpty() ? fallback.days() : days, DISCLAIMER, true);
        } catch (Exception ignored) { return fallback; }
    }

    public MealPlanResponse mealPlan(MealPlanRequest request) {
        MealPlanResponse fallback = fallbackMealPlan(request);
        if (apiKey.isBlank()) return fallback;
        try {
            String input = "Create a practical seven-day meal plan. Return ONLY JSON with name, summary, days. Each day has day and meals; each meal has name, calories, protein, carbohydrates, fat, ingredients with name, quantity, unit. Respect allergies and dislikes. Inputs: " + mapper.writeValueAsString(request);
            JsonNode parsed = mapper.readTree(extractText(call(input)));
            List<MealPlanDay> days = mapper.convertValue(parsed.path("days"), mapper.getTypeFactory().constructCollectionType(List.class, MealPlanDay.class));
            MealPlanResponse generated = new MealPlanResponse(parsed.path("name").asText(fallback.name()), parsed.path("summary").asText(fallback.summary()), days == null || days.isEmpty() ? fallback.days() : days, DISCLAIMER, true);
            return violates(generated, new DietRules(request)) ? fallback : generated;
        } catch (Exception ignored) { return fallback; }
    }

    private JsonNode call(String input) {
        return client.post().uri("/responses").header("Authorization", "Bearer " + apiKey).body(Map.of("model", model, "input", input)).retrieve().body(JsonNode.class);
    }
    private String extractText(JsonNode response) {
        if (response == null) throw new IllegalStateException("Empty AI response");
        for (JsonNode output : response.path("output")) for (JsonNode content : output.path("content")) if (content.has("text")) return content.path("text").asText();
        throw new IllegalStateException("No text in AI response");
    }
    private WorkoutPlanResponse fallbackPlan(WorkoutPlanRequest request) {
        List<String> focuses = List.of("Upper body strength", "Lower body strength", "Push hypertrophy", "Pull hypertrophy", "Full body conditioning", "Mobility and core", "Active recovery");
        String equipment = String.join(" ", request.availableEquipment()).toLowerCase(Locale.ROOT);
        List<String> pool = new ArrayList<>();
        if (equipment.contains("barbell")) pool.addAll(List.of("Barbell Bench Press", "Back Squat", "Romanian Deadlift"));
        if (equipment.contains("dumbbell")) pool.addAll(List.of("Incline Dumbbell Press", "Goblet Squat", "Single-arm Dumbbell Row", "Farmer Carry"));
        if (equipment.contains("cable")) pool.addAll(List.of("Seated Cable Row", "Lat Pulldown", "Face Pull", "Triceps Pushdown"));
        if (equipment.contains("machine")) pool.addAll(List.of("Leg Press", "Leg Curl", "Stationary Bike", "Assisted Pull-up"));
        if (equipment.contains("kettlebell")) pool.addAll(List.of("Kettlebell Swing", "Goblet Squat", "Farmer Carry"));
        if (pool.isEmpty() || equipment.contains("bodyweight") || equipment.contains("none")) pool.addAll(List.of("Push-up", "Bulgarian Split Squat", "Glute Bridge", "Plank", "Burpee"));
        pool = new ArrayList<>(new LinkedHashSet<>(pool));
        List<WorkoutDay> days = new ArrayList<>();
        for (int i = 0; i < request.daysPerWeek(); i++) {
            String focus = focuses.get(i);
            days.add(new WorkoutDay("Day " + (i + 1), focus, List.of(
                new WorkoutExercisePlan(pool.get((i * 3) % pool.size()), 3, "8-10", 90, "Leave two reps in reserve"),
                new WorkoutExercisePlan(pool.get((i * 3 + 1) % pool.size()), 3, "10-12", 90, "Use a controlled eccentric"),
                new WorkoutExercisePlan(pool.get((i * 3 + 2) % pool.size()), 3, "10-12", 60, "Keep each repetition controlled"))));
        }
        return new WorkoutPlanResponse(request.daysPerWeek() + "-Day " + request.fitnessGoal() + " Plan", request.fitnessGoal(), request.daysPerWeek() + " sessions per week, designed for about " + request.workoutDuration() + " minutes each.", days, DISCLAIMER, false);
    }

    private InsightResponse deterministicInsights(InsightRequest request) {
        int workouts = request.workouts() == null ? 0 : request.workouts().size();
        int nutritionDays = request.nutrition() == null ? 0 : request.nutrition().size();
        int sleepDays = request.sleep() == null ? 0 : request.sleep().size();
        List<String> wins = new ArrayList<>();
        wins.add(workouts >= 3 ? "You built a consistent training rhythm this week." : "You logged your activity and created a useful baseline.");
        if (nutritionDays >= 5) wins.add("Nutrition logging was consistent across most of the week.");
        if (sleepDays >= 5) wins.add("Recovery data is detailed enough to spot meaningful patterns.");
        List<String> attention = List.of("Protein distribution is the clearest opportunity for improvement.", "Keep sleep and hydration consistent around demanding sessions.");
        String proteinSuggestion = "a protein-rich food";
        Object dietary = request.profile() == null ? null : request.profile().get("dietaryProfile");
        if (dietary instanceof com.pulse.dto.DietaryProfileDtos.DietaryProfileInput profile && !profile.preferredProteinSources().isEmpty())
            proteinSuggestion = profile.preferredProteinSources().stream().limit(3).map(value -> value.toLowerCase(Locale.ROOT).replace('_', ' ')).reduce((a, b) -> a + ", " + b).orElse(proteinSuggestion);
        else if (dietary instanceof Map<?, ?> map && map.get("preferredProteinSources") instanceof Collection<?> sources && !sources.isEmpty())
            proteinSuggestion = sources.stream().limit(3).map(Object::toString).map(value -> value.toLowerCase(Locale.ROOT).replace('_', ' ')).reduce((a, b) -> a + ", " + b).orElse(proteinSuggestion);
        List<String> recommendations = List.of("Add " + proteinSuggestion + " to breakfast or your afternoon snack.", "Aim for a consistent sleep window across training and rest days.", "Schedule one lower-intensity recovery session this week.");
        return new InsightResponse("Your recent data shows positive momentum with a few practical recovery opportunities.", wins, attention, recommendations, DISCLAIMER, false);
    }

    private List<String> strings(JsonNode node, String key, List<String> fallback) { List<String> values = new ArrayList<>(); node.path(key).forEach(value -> values.add(value.asText())); return values.isEmpty() ? fallback : values; }

    public record ChatText(String title, String answer, List<String> evidence, boolean generatedByAi) {}

    private MealPlanResponse fallbackMealPlan(MealPlanRequest request) {
        List<String> days = List.of("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday");
        DietRules rules = new DietRules(request);
        boolean avoidGluten = !rules.allowed("Seitan");
        List<String> proteinPool = rules.proteinPool();
        List<MealPlanDay> plan = new ArrayList<>();
        for (int i = 0; i < days.size(); i++) {
            List<PlannedMeal> meals = new ArrayList<>();
            String breakfastProtein = rules.firstAllowed(List.of("Dairy", "Eggs", "Tofu", "Protein powder", "Lentils"), proteinPool.getFirst());
            String grain = rules.safeIngredient(avoidGluten ? "Rice flakes" : "Rolled oats", "Brown rice", "Quinoa");
            meals.add(meal(rules.cuisinePrefix() + breakfastProtein + " Breakfast Bowl", 520, 38, 55, 16,
                List.of(new Ingredient(rules.ingredient(breakfastProtein), 180, "g"), new Ingredient(grain, 60, "g"), new Ingredient(rules.safeIngredient("Mixed berries", "Apple", "Pear"), 100, "g"))));
            String lunchProtein = proteinPool.get(i % proteinPool.size());
            meals.add(meal(rules.cuisinePrefix() + lunchProtein + " Quinoa Bowl", 690, 46, 82, 20,
                List.of(new Ingredient(rules.ingredient(lunchProtein), 180, "g"), new Ingredient(rules.safeIngredient("Quinoa", "Brown rice", "Rice noodles"), 100, "g"), new Ingredient(rules.safeIngredient("Spinach", "Kale", "Green beans"), 80, "g"))));
            String dinnerProtein = proteinPool.get((i + 1) % proteinPool.size());
            meals.add(meal(rules.cuisinePrefix() + dinnerProtein + " Rice Bowl", 760, 48, 92, 22,
                List.of(new Ingredient(rules.ingredient(dinnerProtein), 180, "g"), new Ingredient(rules.safeIngredient("Brown rice", "Quinoa", "Rice noodles"), 120, "g"), new Ingredient(rules.safeIngredient("Mixed vegetables", "Spinach", "Kale"), 180, "g"))));
            String snackProtein = rules.firstAllowed(List.of("Dairy", "Protein powder", "Chickpeas", "Beans"), proteinPool.getFirst());
            meals.add(meal(snackProtein + " Fruit Snack", 230, 22, 28, 4, List.of(new Ingredient(rules.ingredient(snackProtein), 120, "g"), new Ingredient(rules.safeIngredient("Banana", "Apple", "Pear"), 1, "each"))));
            meals.add(meal("Herbed " + proteinPool.get((i + 2) % proteinPool.size()) + " Salad", 340, 28, 34, 10, List.of(new Ingredient(rules.ingredient(proteinPool.get((i + 2) % proteinPool.size())), 140, "g"), new Ingredient(rules.safeIngredient("Leafy greens", "Spinach", "Kale"), 120, "g"), new Ingredient(rules.safeIngredient("Tomato", "Cucumber", "Capsicum"), 80, "g"))));
            meals.add(meal("Protein Rice Cakes", 260, 20, 32, 6, List.of(new Ingredient(rules.ingredient(snackProtein), 80, "g"), new Ingredient(rules.safeIngredient("Rice cakes", "Quinoa", "Brown rice"), 2, "each"))));
            plan.add(new MealPlanDay(days.get(i), meals.subList(0, Math.min(request.mealsPerDay(), meals.size()))));
        }
        return new MealPlanResponse("Personalised High Protein Weekly Plan", "A practical " + request.calorieTarget() + " kcal template filtered for your dietary profile, with repeat ingredients to simplify shopping.", plan, DISCLAIMER, false);
    }
    private PlannedMeal meal(String name, int calories, int protein, int carbs, int fat, List<Ingredient> ingredients) { return new PlannedMeal(name, calories, protein, carbs, fat, ingredients); }

    private boolean violates(MealPlanResponse plan, DietRules rules) {
        return plan.days().stream().flatMap(day -> day.meals().stream()).flatMap(meal -> meal.ingredients().stream()).anyMatch(ingredient -> !rules.allowedIngredient(ingredient.name()));
    }

    private static final class DietRules {
        private final String pattern;
        private final String all;
        private final List<String> preferred;
        private final String cuisine;
        DietRules(MealPlanRequest request) {
            var profile = request.dietaryProfile();
            pattern = (profile == null ? request.dietaryPreference() : profile.dietaryPattern()).toUpperCase(Locale.ROOT);
            List<String> values = new ArrayList<>(List.of(request.dietaryPreference(), request.allergies(), request.dislikedFoods()));
            if (profile != null) { values.addAll(profile.restrictions()); values.addAll(profile.customExclusions()); values.addAll(profile.culturalPreferences()); values.addAll(profile.allergies()); values.addAll(profile.intolerances()); values.addAll(profile.dislikedFoods()); }
            all = String.join(" ", values).toLowerCase(Locale.ROOT).replace('_', ' ');
            preferred = profile == null ? List.of() : profile.preferredProteinSources().stream().map(DietRules::titleStatic).toList();
            cuisine = profile == null || profile.preferredCuisines().isEmpty() ? "" : profile.preferredCuisines().iterator().next();
        }
        boolean allowed(String source) { return allowedIngredient(source); }
        boolean allowedIngredient(String ingredient) {
            String value = ingredient.toLowerCase(Locale.ROOT).replace('_', ' ');
            boolean vegan = pattern.contains("VEGAN");
            boolean vegetarian = vegan || pattern.contains("VEGETARIAN") || pattern.contains("EGGETARIAN");
            boolean pescatarian = pattern.contains("PESCATARIAN");
            if ((vegan || containsAny(all, "dairy free", "milk", "lactose")) && containsAny(value, "dairy", "milk", "yoghurt", "yogurt", "cheese", "whey")) return false;
            if ((vegan || containsAny(all, "no eggs", "eggs", "egg allergy")) && value.contains("egg")) return false;
            if ((vegetarian || pescatarian || containsAny(all, "no poultry")) && containsAny(value, "chicken", "turkey", "poultry")) return false;
            if ((vegetarian || pescatarian || containsAny(all, "no beef", "no red meat")) && containsAny(value, "beef", "lamb", "red meat")) return false;
            if ((vegetarian || pescatarian || containsAny(all, "no pork", "halal", "kosher")) && containsAny(value, "pork", "ham", "bacon")) return false;
            if ((vegetarian || containsAny(all, "no seafood", "fish")) && containsAny(value, "fish", "salmon", "tuna", "seafood")) return false;
            if (containsAny(all, "shellfish allergy", "shellfish") && containsAny(value, "prawn", "shrimp", "shellfish", "crab")) return false;
            if (containsAny(all, "soy free", "soy") && containsAny(value, "soy", "tofu", "tempeh")) return false;
            if (containsAny(all, "gluten free", "gluten", "wheat") && containsAny(value, "wheat", "bread", "noodle", "seitan", "sourdough", "oat")) return false;
            if (containsAny(all, "nut free", "peanut", "tree nuts") && containsAny(value, "peanut", "almond", "cashew", "walnut", "nut butter")) return false;
            if ((all.contains("sesame") && value.contains("sesame")) || (all.contains("kosher") && containsAny(value, "shellfish", "prawn", "shrimp", "crab"))) return false;
            if (all.contains("jain") && containsAny(value, "onion", "garlic", "potato", "carrot", "beetroot", "egg", "meat", "fish", "chicken", "beef")) return false;
            if (vegan && containsAny(value, "chicken", "beef", "fish", "egg", "dairy", "yoghurt", "yogurt", "cheese", "whey")) return false;
            return !all.contains(value + " allergy") && !all.contains("no " + value) && !all.contains(value);
        }
        List<String> proteinPool() {
            List<String> candidates = new ArrayList<>(preferred);
            if (pattern.contains("VEGAN")) candidates.addAll(List.of("Tofu", "Tempeh", "Lentils", "Beans", "Chickpeas", "Seitan", "Protein powder"));
            else if (pattern.contains("VEGETARIAN") || pattern.contains("EGGETARIAN")) candidates.addAll(List.of("Eggs", "Dairy", "Tofu", "Tempeh", "Lentils", "Beans", "Chickpeas", "Seitan", "Protein powder"));
            else if (pattern.contains("PESCATARIAN")) candidates.addAll(List.of("Fish", "Eggs", "Dairy", "Tofu", "Lentils", "Beans"));
            else candidates.addAll(List.of("Chicken", "Fish", "Eggs", "Dairy", "Tofu", "Lentils", "Beans", "Chickpeas"));
            List<String> allowed = candidates.stream().filter(this::allowed).distinct().toList();
            return allowed.isEmpty() ? List.of("Lentils", "Beans", "Chickpeas") : allowed;
        }
        String firstAllowed(List<String> candidates, String fallback) { return candidates.stream().filter(this::allowed).findFirst().orElse(fallback); }
        String safeIngredient(String preferred, String... alternatives) {
            if (allowedIngredient(preferred)) return preferred;
            return Arrays.stream(alternatives).filter(this::allowedIngredient).findFirst().orElse("Seasonal produce");
        }
        String ingredient(String source) { return switch (source.toLowerCase(Locale.ROOT).replace('_', ' ')) { case "dairy" -> "Greek yoghurt"; case "fish" -> "Salmon"; case "protein powder" -> "Pea protein powder"; default -> source; }; }
        String cuisinePrefix() { return cuisine == null || cuisine.isBlank() ? "" : title(cuisine) + "-inspired "; }
        private String title(String value) { return titleStatic(value); }
        private static String titleStatic(String value) { String normalized = value.toLowerCase(Locale.ROOT).replace('_', ' '); return Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1); }
    }

    private static boolean containsAny(String value, String... terms) { return Arrays.stream(terms).anyMatch(value::contains); }
}
