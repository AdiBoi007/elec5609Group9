package com.pulse.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.dto.AiDtos.*;
import com.pulse.dto.PlanDtos.*;
import com.pulse.entity.*;
import com.pulse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class PlanService {
    private final UserRepository users;
    private final GeneratedWorkoutPlanRepository workoutPlans;
    private final GeneratedMealPlanRepository mealPlans;
    private final GroceryListRepository groceryLists;
    private final GroceryItemRepository groceryItems;
    private final AiService aiService;
    private final ObjectMapper mapper;
    private final DietaryProfileService dietaryProfiles;

    @Transactional
    public WorkoutPlanRecord generateWorkout(String email, WorkoutPlanRequest request) {
        WorkoutPlanResponse generated = aiService.workoutPlan(request);
        GeneratedWorkoutPlan entity = new GeneratedWorkoutPlan(); entity.setUser(user(email)); entity.setName(generated.name()); entity.setGoal(generated.goal()); entity.setDaysPerWeek(generated.days().size()); entity.setSaved(true); entity.setPlanJson(json(generated));
        return workoutRecord(workoutPlans.save(entity));
    }
    @Transactional(readOnly = true)
    public List<WorkoutPlanRecord> workoutPlans(String email) { return workoutPlans.findByUserIdOrderByCreatedAtDesc(user(email).getId()).stream().map(this::workoutRecord).toList(); }
    @Transactional(readOnly = true)
    public WorkoutPlanRecord workoutPlan(String email, Long id) { return workoutRecord(ownedWorkout(email, id)); }
    @Transactional public void deleteWorkoutPlan(String email, Long id) { workoutPlans.delete(ownedWorkout(email, id)); }

    @Transactional
    public MealPlanRecord generateMeal(String email, MealPlanRequest request) {
        User owner = user(email);
        var dietary = dietaryProfiles.input(owner.getProfile());
        MealPlanRequest enriched = new MealPlanRequest(request.calorieTarget(), request.proteinTarget(), request.carbohydrateTarget(), request.fatTarget(),
            dietary.dietaryPattern(), String.join(", ", dietary.allergies()), String.join(", ", dietary.dislikedFoods()), request.mealsPerDay(), dietary);
        MealPlanResponse generated = aiService.mealPlan(enriched);
        GeneratedMealPlan entity = new GeneratedMealPlan(); entity.setUser(owner); entity.setName(generated.name()); entity.setCalorieTarget(request.calorieTarget()); entity.setSaved(true); entity.setPlanJson(json(generated));
        return mealRecord(mealPlans.save(entity));
    }
    @Transactional(readOnly = true)
    public List<MealPlanRecord> mealPlans(String email) { return mealPlans.findByUserIdOrderByCreatedAtDesc(user(email).getId()).stream().map(this::mealRecord).toList(); }
    @Transactional(readOnly = true)
    public MealPlanRecord mealPlan(String email, Long id) { return mealRecord(ownedMeal(email, id)); }
    @Transactional
    public void deleteMealPlan(String email, Long id) {
        GeneratedMealPlan plan = ownedMeal(email, id);
        groceryLists.deleteAll(groceryLists.findByMealPlanId(plan.getId()));
        mealPlans.delete(plan);
    }

    @Transactional
    public GroceryListResponse generateGrocery(String email, Long mealPlanId) {
        GeneratedMealPlan mealPlan = ownedMeal(email, mealPlanId);
        MealPlanResponse plan = read(mealPlan.getPlanJson(), MealPlanResponse.class);
        GroceryList list = new GroceryList(); list.setUser(user(email)); list.setMealPlan(mealPlan); list.setName(mealPlan.getName() + " groceries");
        Map<String, AggregateIngredient> aggregated = new LinkedHashMap<>();
        for (MealPlanDay day : plan.days()) for (PlannedMeal meal : day.meals()) for (Ingredient ingredient : meal.ingredients()) {
            String key = ingredient.name().trim().toLowerCase() + "|" + ingredient.unit().trim().toLowerCase();
            aggregated.compute(key, (ignored, current) -> current == null ? new AggregateIngredient(ingredient.name(), ingredient.quantity(), ingredient.unit()) : current.add(ingredient.quantity()));
        }
        for (AggregateIngredient ingredient : aggregated.values()) { GroceryItem item = new GroceryItem(); item.setGroceryList(list); item.setName(ingredient.name); item.setQuantity(round(ingredient.quantity)); item.setUnit(ingredient.unit); item.setCategory(category(ingredient.name)); list.getItems().add(item); }
        return groceryResponse(groceryLists.save(list));
    }
    @Transactional(readOnly = true)
    public List<GroceryListResponse> groceryLists(String email) { return groceryLists.findByUserIdOrderByCreatedAtDesc(user(email).getId()).stream().map(this::groceryResponse).toList(); }
    @Transactional
    public GroceryItemResponse addItem(String email, Long listId, GroceryItemRequest request) {
        GroceryList list = ownedGrocery(email, listId); GroceryItem item = new GroceryItem(); item.setGroceryList(list); item.setName(request.name()); item.setQuantity(request.quantity()); item.setUnit(request.unit()); item.setCategory(request.category() == null ? "Other" : request.category()); return groceryItem(groceryItems.save(item));
    }
    @Transactional
    public GroceryItemResponse updateItem(String email, Long itemId, GroceryItemUpdate request) {
        GroceryItem item = ownedItem(email, itemId); if (request.name() != null) item.setName(request.name()); if (request.quantity() != null) item.setQuantity(request.quantity()); if (request.unit() != null) item.setUnit(request.unit()); if (request.category() != null) item.setCategory(request.category()); if (request.checked() != null) item.setChecked(request.checked()); return groceryItem(groceryItems.save(item));
    }
    @Transactional public void deleteItem(String email, Long itemId) { groceryItems.delete(ownedItem(email, itemId)); }
    @Transactional public void clearChecked(String email, Long listId) { GroceryList list = ownedGrocery(email, listId); list.getItems().removeIf(GroceryItem::isChecked); groceryLists.save(list); }

    private WorkoutPlanRecord workoutRecord(GeneratedWorkoutPlan entity) { return new WorkoutPlanRecord(entity.getId(), entity.getName(), entity.getGoal(), entity.getDaysPerWeek(), entity.isSaved(), entity.getCreatedAt(), read(entity.getPlanJson(), WorkoutPlanResponse.class)); }
    private MealPlanRecord mealRecord(GeneratedMealPlan entity) { return new MealPlanRecord(entity.getId(), entity.getName(), entity.getCalorieTarget(), entity.isSaved(), entity.getCreatedAt(), read(entity.getPlanJson(), MealPlanResponse.class)); }
    private GroceryListResponse groceryResponse(GroceryList list) { return new GroceryListResponse(list.getId(), list.getMealPlan() == null ? null : list.getMealPlan().getId(), list.getName(), list.getCreatedAt(), list.getItems().stream().map(this::groceryItem).toList()); }
    private GroceryItemResponse groceryItem(GroceryItem item) { return new GroceryItemResponse(item.getId(), item.getName(), item.getQuantity(), item.getUnit(), item.getCategory(), item.isChecked()); }
    private GeneratedWorkoutPlan ownedWorkout(String email, Long id) { GeneratedWorkoutPlan plan = workoutPlans.findById(id).orElseThrow(() -> new IllegalArgumentException("Workout plan not found")); if (!plan.getUser().getEmail().equalsIgnoreCase(email)) throw new IllegalArgumentException("Workout plan not found"); return plan; }
    private GeneratedMealPlan ownedMeal(String email, Long id) { GeneratedMealPlan plan = mealPlans.findById(id).orElseThrow(() -> new IllegalArgumentException("Meal plan not found")); if (!plan.getUser().getEmail().equalsIgnoreCase(email)) throw new IllegalArgumentException("Meal plan not found"); return plan; }
    private GroceryList ownedGrocery(String email, Long id) { GroceryList list = groceryLists.findById(id).orElseThrow(() -> new IllegalArgumentException("Grocery list not found")); if (!list.getUser().getEmail().equalsIgnoreCase(email)) throw new IllegalArgumentException("Grocery list not found"); return list; }
    private GroceryItem ownedItem(String email, Long id) { GroceryItem item = groceryItems.findById(id).orElseThrow(() -> new IllegalArgumentException("Grocery item not found")); if (!item.getGroceryList().getUser().getEmail().equalsIgnoreCase(email)) throw new IllegalArgumentException("Grocery item not found"); return item; }
    private User user(String email) { return users.findByEmailIgnoreCase(email).orElseThrow(); }
    private String json(Object value) { try { return mapper.writeValueAsString(value); } catch (JsonProcessingException e) { throw new IllegalStateException("Unable to save generated plan", e); } }
    private <T> T read(String value, Class<T> type) { try { return mapper.readValue(value, type); } catch (JsonProcessingException e) { throw new IllegalStateException("Saved plan is invalid", e); } }
    private double round(double value) { return Math.round(value * 10d) / 10d; }
    private String category(String name) { String value = name.toLowerCase(); if (value.matches(".*(chicken|beef|salmon|tuna|egg).*")) return "Protein"; if (value.matches(".*(rice|oat|quinoa|bread|noodle|sourdough).*")) return "Pantry"; if (value.matches(".*(yoghurt|yogurt).*")) return "Dairy"; return "Produce"; }
    private static class AggregateIngredient { String name; double quantity; String unit; AggregateIngredient(String name, double quantity, String unit) { this.name = name; this.quantity = quantity; this.unit = unit; } AggregateIngredient add(double amount) { quantity += amount; return this; } }
}
