package com.pulse.service;

import com.pulse.entity.*;
import com.pulse.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import com.pulse.dto.DietaryProfileDtos.DietCompatibility;

@Service @RequiredArgsConstructor
public class MealService {
    private final MealRepository meals;
    private final FoodRepository foods;
    private final UserRepository users;
    private final DietCompatibilityService dietCompatibility;

    @Transactional
    public MealResponse log(String email, MealRequest request) {
        Meal meal = new Meal(); meal.setUser(users.findByEmailIgnoreCase(email).orElseThrow()); meal.setName(request.name()); meal.setMealType(request.mealType()); meal.setEatenAt(request.eatenAt() == null ? LocalDateTime.now() : request.eatenAt()); meal.setReusable(request.reusable());
        double calories = 0, protein = 0, carbs = 0, fat = 0, fibre = 0, sugar = 0, saturatedFat = 0;
        for (FoodInput input : request.foods()) {
            Food food = foods.findById(input.foodId()).orElseThrow(() -> new IllegalArgumentException("Food not found: " + input.foodId()));
            if (food.getOwner() != null && !food.getOwner().getId().equals(meal.getUser().getId())) throw new IllegalArgumentException("Food not found: " + input.foodId());
            MealFood item = new MealFood(); item.setMeal(meal); item.setFood(food); item.setQuantity(input.quantity()); item.setUnit(input.unit()); meal.getFoods().add(item);
            double multiplier = input.quantity() / (food.getServingSize() == null || food.getServingSize() == 0 ? 100 : food.getServingSize()); calories += value(food.getCalories()) * multiplier; protein += value(food.getProtein()) * multiplier; carbs += value(food.getCarbohydrates()) * multiplier; fat += value(food.getFat()) * multiplier; fibre += value(food.getFibre()) * multiplier; sugar += value(food.getSugar()) * multiplier; saturatedFat += value(food.getSaturatedFat()) * multiplier;
        }
        meal.setQualityScore(quality(calories, protein, carbs, fat, fibre, sugar, saturatedFat).score());
        return response(meals.save(meal));
    }
    @Transactional(readOnly = true)
    public List<MealResponse> today(String email) {
        return history(email, 1);
    }
    @Transactional(readOnly = true)
    public List<MealResponse> history(String email, int days) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow(); LocalDateTime start = LocalDate.now().atStartOfDay();
        return meals.findByUserIdAndEatenAtBetween(user.getId(), start.minusDays(Math.max(0, Math.min(days, 90) - 1L)), start.plusDays(1)).stream().map(this::response).toList();
    }
    @Transactional
    public void delete(String email, Long id) {
        Meal meal = meals.findById(id).orElseThrow(() -> new IllegalArgumentException("Meal not found"));
        if (!meal.getUser().getEmail().equalsIgnoreCase(email)) throw new IllegalArgumentException("Meal not found");
        meals.delete(meal);
    }
    @Transactional
    public MealResponse repeat(String email, Long id) {
        Meal source = owned(email, id);
        return log(email, new MealRequest(source.getName(), source.getMealType(), null, source.isReusable(), source.getFoods().stream().map(item -> new FoodInput(item.getFood().getId(), item.getQuantity(), item.getUnit() == null ? item.getFood().getServingUnit() : item.getUnit())).toList()));
    }
    @Transactional
    public MealResponse repeatLast(String email, String type) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        Meal source = meals.findByUserIdOrderByEatenAtDesc(user.getId()).stream().filter(meal -> type == null || type.isBlank() || meal.getMealType().equalsIgnoreCase(type)).findFirst().orElseThrow(() -> new IllegalArgumentException("No previous meal found"));
        return repeat(email, source.getId());
    }
    @Transactional(readOnly = true)
    public List<FoodShortcut> foodShortcuts(String email, String mode) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        List<Meal> history = meals.findByUserIdOrderByEatenAtDesc(user.getId());
        Map<Long, ShortcutAccumulator> values = new LinkedHashMap<>();
        history.stream().limit(120).forEach(meal -> meal.getFoods().forEach(item -> values.compute(item.getFood().getId(), (id, existing) -> existing == null ? new ShortcutAccumulator(item.getFood(), 1, meal.getEatenAt()) : existing.increment())));
        Comparator<ShortcutAccumulator> order = "frequent".equalsIgnoreCase(mode) ? Comparator.comparingInt(ShortcutAccumulator::count).reversed().thenComparing(ShortcutAccumulator::lastUsed, Comparator.reverseOrder()) : Comparator.comparing(ShortcutAccumulator::lastUsed).reversed();
        return values.values().stream().sorted(order).limit(12).map(value -> shortcut(value.food(), value.count(), value.lastUsed())).toList();
    }
    private FoodShortcut shortcut(Food food, int count, LocalDateTime lastUsed) { return new FoodShortcut(food.getId(), food.getName(), food.getBrand(), food.getServingSize(), food.getServingUnit(), food.getCalories(), food.getProtein(), food.getCarbohydrates(), food.getFat(), count, lastUsed); }
    private Meal owned(String email, Long id) { Meal meal = meals.findById(id).orElseThrow(() -> new IllegalArgumentException("Meal not found")); if (!meal.getUser().getEmail().equalsIgnoreCase(email)) throw new IllegalArgumentException("Meal not found"); return meal; }
    private MealResponse response(Meal meal) {
        double calories=0, protein=0, carbs=0, fat=0, fibre=0, sugar=0, saturatedFat=0;
        for (MealFood item : meal.getFoods()) { Food f=item.getFood(); double m=item.getQuantity()/(f.getServingSize()==null||f.getServingSize()==0?100:f.getServingSize()); calories+=value(f.getCalories())*m;protein+=value(f.getProtein())*m;carbs+=value(f.getCarbohydrates())*m;fat+=value(f.getFat())*m;fibre+=value(f.getFibre())*m;sugar+=value(f.getSugar())*m;saturatedFat+=value(f.getSaturatedFat())*m; }
        Quality quality = quality(calories, protein, carbs, fat, fibre, sugar, saturatedFat);
        DietCompatibility compatibility = dietCompatibility.combine(meal.getFoods().stream().map(item -> dietCompatibility.evaluate(meal.getUser().getProfile(), item.getFood())).toList());
        return new MealResponse(meal.getId(), meal.getName(), meal.getMealType(), meal.getEatenAt(), quality.score(), quality.rating(), quality.positives(), quality.improvements(), Math.round(calories), Math.round(protein), Math.round(carbs), Math.round(fat), compatibility.status(), compatibility.warnings());
    }
    private double value(Double value) { return value == null ? 0 : value; }
    public record MealRequest(@NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 50) String mealType, @PastOrPresent LocalDateTime eatenAt,
        boolean reusable, @NotEmpty @Valid List<FoodInput> foods) {}
    public record FoodInput(@NotNull @Positive Long foodId,
        @Positive @DecimalMax("100000.0") double quantity, @NotBlank @Size(max = 30) String unit) {}
    private Quality quality(double calories, double protein, double carbs, double fat, double fibre, double sugar, double saturatedFat) {
        int score = 45; List<String> positives = new java.util.ArrayList<>(); List<String> improvements = new java.util.ArrayList<>();
        if (protein >= 25) { score += 20; positives.add("High protein"); } else if (protein >= 15) { score += 12; positives.add("Useful protein contribution"); } else improvements.add("Could include more protein");
        if (fibre >= 8) { score += 18; positives.add("High fibre"); } else if (fibre >= 4) { score += 10; positives.add("Contains fibre"); } else improvements.add("Could contain more fibre");
        double macroCalories = protein * 4 + carbs * 4 + fat * 9; double proteinShare = macroCalories == 0 ? 0 : protein * 4 / macroCalories;
        if (proteinShare >= .18 && proteinShare <= .4 && fat <= 35) { score += 12; positives.add("Balanced macronutrients"); } else improvements.add("Balance protein, carbohydrates and fats");
        if (sugar > 25) { score -= 12; improvements.add("High in sugar"); }
        if (saturatedFat > 10) { score -= 10; improvements.add("High in saturated fat"); }
        if (calories > 1100) { score -= 8; improvements.add("Large calorie load for one meal"); }
        score = Math.max(0, Math.min(100, score)); String rating = score >= 85 ? "Excellent" : score >= 70 ? "Great" : score >= 55 ? "Good" : score >= 40 ? "Fair" : "Needs balance";
        return new Quality(score, rating, positives, improvements);
    }
    private record Quality(int score, String rating, List<String> positives, List<String> improvements) {}
    public record MealResponse(Long id, String name, String mealType, LocalDateTime eatenAt, Integer qualityScore, String qualityRating, List<String> positives, List<String> improvements, long calories, long protein, long carbohydrates, long fat, String dietCompatibility, List<String> dietWarnings) {}
    public record FoodShortcut(Long id, String name, String brand, Double servingSize, String servingUnit, Double calories, Double protein, Double carbohydrates, Double fat, int useCount, LocalDateTime lastUsedAt) {}
    private record ShortcutAccumulator(Food food, int count, LocalDateTime lastUsed) { ShortcutAccumulator increment() { return new ShortcutAccumulator(food, count + 1, lastUsed); } }
}
