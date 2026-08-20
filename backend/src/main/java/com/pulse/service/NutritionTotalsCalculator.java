package com.pulse.service;

import com.pulse.entity.Food;
import com.pulse.entity.Meal;
import com.pulse.entity.MealFood;
import org.springframework.stereotype.Component;

@Component
public class NutritionTotalsCalculator {
    public Totals calculate(Meal meal) {
        double calories = 0;
        double protein = 0;
        double carbohydrates = 0;
        double fat = 0;
        for (MealFood item : meal.getFoods()) {
            Food food = item.getFood();
            double serving = food.getServingSize() == null || food.getServingSize() == 0 ? 100 : food.getServingSize();
            double multiplier = item.getQuantity() / serving;
            calories += value(food.getCalories()) * multiplier;
            protein += value(food.getProtein()) * multiplier;
            carbohydrates += value(food.getCarbohydrates()) * multiplier;
            fat += value(food.getFat()) * multiplier;
        }
        return new Totals(calories, protein, carbohydrates, fat);
    }

    private double value(Double value) { return value == null ? 0 : value; }

    public record Totals(double calories, double protein, double carbohydrates, double fat) {}
}
