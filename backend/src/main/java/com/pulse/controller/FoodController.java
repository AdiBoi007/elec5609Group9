package com.pulse.controller;

import com.pulse.entity.Food;
import com.pulse.entity.User;
import com.pulse.repository.FoodRepository;
import com.pulse.repository.UserRepository;
import com.pulse.service.FoodLookupService;
import com.pulse.service.DietCompatibilityService;
import com.pulse.dto.DietaryProfileDtos.DietCompatibility;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/foods") @RequiredArgsConstructor
public class FoodController {
    private final FoodLookupService lookup;
    private final FoodRepository foods;
    private final UserRepository users;
    private final DietCompatibilityService compatibility;
    @GetMapping @Transactional(readOnly = true) List<FoodResponse> search(Authentication auth, @RequestParam(defaultValue = "") @Size(max = 100) String query) {
        User owner = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        return foods.searchAvailable(owner.getId(), query.trim()).stream().limit(50).map(food -> FoodResponse.from(food, compatibility.evaluate(owner.getProfile(), food))).toList();
    }
    @GetMapping("/barcode/{barcode}") @Transactional(readOnly = true) FoodResponse barcode(Authentication auth, @PathVariable String barcode) {
        if (!barcode.matches("\\d{6,14}")) throw new IllegalArgumentException("Enter a valid 6 to 14 digit barcode");
        Food food = lookup.findByBarcode(barcode);
        User user = auth == null ? null : users.findByEmailIgnoreCase(auth.getName()).orElse(null);
        return FoodResponse.from(food, user == null ? new DietCompatibility("UNKNOWN", false, java.util.List.of("Dietary compatibility could not be fully verified.")) : compatibility.evaluate(user.getProfile(), food));
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) @Transactional
    FoodResponse create(Authentication auth, @Valid @RequestBody FoodRequest request) {
        User owner = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        Food food = new Food(); food.setOwner(owner); food.setCustomFood(true); food.setName(request.name()); food.setServingSize(request.servingSize()); food.setServingUnit(request.servingUnit()); food.setMeasurementType(measurementType(request.servingUnit())); food.setNutritionBasisQuantity(request.servingSize()); food.setNutritionBasisUnit(request.servingUnit()); food.setCalories(request.calories()); food.setProtein(request.protein()); food.setCarbohydrates(request.carbohydrates()); food.setFat(request.fat()); food.setFibre(request.fibre()); food.setSugar(request.sugar()); food.setSaturatedFat(request.saturatedFat());
        Food saved = foods.save(food);
        return FoodResponse.from(saved, compatibility.evaluate(owner.getProfile(), saved));
    }
    public record FoodRequest(@NotBlank @Size(max = 180) String name,
        @Positive @DecimalMax("100000.0") double servingSize, @NotBlank @Size(max = 30) String servingUnit,
        @PositiveOrZero @DecimalMax("10000.0") double calories,
        @PositiveOrZero @DecimalMax("2000.0") double protein,
        @PositiveOrZero @DecimalMax("2000.0") double carbohydrates,
        @PositiveOrZero @DecimalMax("2000.0") double fat,
        @PositiveOrZero @DecimalMax("2000.0") double fibre,
        @PositiveOrZero @DecimalMax("2000.0") Double sugar,
        @PositiveOrZero @DecimalMax("2000.0") Double saturatedFat) {}
    public record FoodResponse(Long id, String name, String brand, Double servingSize, String servingUnit,
        String measurementType, Double nutritionBasisQuantity, String nutritionBasisUnit,
        Double packageQuantity, String packageUnit, Double suggestedServingQuantity, String suggestedServingUnit,
        Double calories, Double protein, Double carbohydrates, Double fat, Double fibre, Double sugar, Double saturatedFat, String ingredientsText, DietCompatibility compatibility) {
        static FoodResponse from(Food food, DietCompatibility compatibility) {
            String unit = food.getNutritionBasisUnit() == null || food.getNutritionBasisUnit().isBlank() ? food.getServingUnit() : food.getNutritionBasisUnit();
            Double basis = food.getNutritionBasisQuantity() == null || food.getNutritionBasisQuantity() <= 0 ? food.getServingSize() : food.getNutritionBasisQuantity();
            return new FoodResponse(food.getId(), food.getName(), food.getBrand() == null ? "" : food.getBrand(), food.getServingSize(), food.getServingUnit(),
                food.getMeasurementType() == null ? FoodController.measurementType(unit) : food.getMeasurementType(), basis, unit,
                food.getPackageQuantity(), food.getPackageUnit(), food.getSuggestedServingQuantity(), food.getSuggestedServingUnit(),
                food.getCalories(), food.getProtein(), food.getCarbohydrates(), food.getFat(), food.getFibre(), food.getSugar(), food.getSaturatedFat(), food.getIngredientsText(), compatibility);
        }
    }
    private static String measurementType(String unit) {
        if (unit == null) return "UNKNOWN";
        return switch (unit.trim().toLowerCase()) { case "ml", "l", "cl" -> "LIQUID"; case "g", "kg" -> "SOLID"; case "serving", "unit", "piece" -> "SERVING"; default -> "UNKNOWN"; };
    }
}
