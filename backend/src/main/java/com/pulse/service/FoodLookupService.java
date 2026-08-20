package com.pulse.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pulse.entity.Food;
import com.pulse.repository.FoodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service @RequiredArgsConstructor
public class FoodLookupService {
    private final FoodRepository foods;
    private final RestClient restClient = RestClient.builder()
        .baseUrl("https://world.openfoodfacts.org")
        .defaultHeader("User-Agent", "PulseUniversityProject/1.0")
        .build();

    public Food findByBarcode(String barcode) {
        return foods.findByBarcode(barcode)
            .map(food -> hasNormalizedMetadata(food) ? food : refreshLegacyCache(barcode, food))
            .orElseGet(() -> fetchAndCache(barcode));
    }

    private boolean hasNormalizedMetadata(Food food) {
        return food.getMeasurementType() != null && !food.getMeasurementType().isBlank() && !food.getMeasurementType().equals("UNKNOWN")
            && food.getNutritionBasisQuantity() != null && food.getNutritionBasisQuantity() > 0
            && food.getNutritionBasisUnit() != null && !food.getNutritionBasisUnit().isBlank();
    }

    private Food refreshLegacyCache(String barcode, Food existing) {
        try {
            JsonNode response = restClient.get().uri("/api/v2/product/{barcode}.json", barcode).retrieve().body(JsonNode.class);
            if (response != null && response.path("status").asInt() == 1)
                return foods.save(normalizeProduct(barcode, response.path("product"), existing));
        } catch (RestClientException ignored) {
            // A usable cached food is still better than blocking manual logging when Open Food Facts is offline.
        }
        existing.setMeasurementType("UNKNOWN");
        return existing;
    }

    private Food fetchAndCache(String barcode) {
        JsonNode response;
        try {
            response = restClient.get().uri("/api/v2/product/{barcode}.json", barcode).retrieve().body(JsonNode.class);
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode() == HttpStatus.NOT_FOUND) throw new IllegalArgumentException("Food barcode not found");
            throw new IllegalStateException("The food lookup service is temporarily unavailable", ex);
        } catch (RestClientException ex) {
            throw new IllegalStateException("The food lookup service is temporarily unavailable", ex);
        }
        if (response == null || response.path("status").asInt() != 1) throw new IllegalArgumentException("Food barcode not found");
        return foods.save(normalizeProduct(barcode, response.path("product"), new Food()));
    }

    Food normalizeProduct(String barcode, JsonNode product, Food food) {
        JsonNode nutrients = product.path("nutriments");
        String brand = product.path("brands").asText("").trim();
        String name = product.path("product_name").asText("").trim();
        if (name.isBlank()) name = brand.isBlank() ? "Barcode food " + barcode : brand;

        UnitQuantity packageSize = quantity(product, "product_quantity", "product_quantity_unit");
        UnitQuantity servingSize = quantity(product, "serving_quantity", "serving_quantity_unit");
        String nutritionDataPer = product.path("nutrition_data_per").asText("").trim().toLowerCase(Locale.ROOT);
        boolean perServing = nutritionDataPer.contains("serving") && hasNutrient(nutrients, "energy-kcal_serving");
        String packageEvidence = normalizeUnit(product.path("product_quantity_unit").asText(""));
        String servingEvidence = normalizeUnit(product.path("serving_quantity_unit").asText(""));
        String nutritionEvidence = nutritionDataPer.contains("ml") ? "mL" : nutritionDataPer.contains("g") ? "g" : null;
        String evidenceUnit = firstNonBlank(
            packageSize == null ? null : packageSize.unit,
            servingSize == null ? null : servingSize.unit,
            packageEvidence,
            servingEvidence,
            nutritionEvidence
        );
        String measurementType = perServing ? "SERVING" : measurementType(evidenceUnit);
        String basisUnit = perServing ? "serving" : switch (measurementType) {
            case "LIQUID" -> "mL";
            case "SOLID" -> "g";
            default -> "g";
        };
        double basisQuantity = perServing ? 1d : 100d;
        String nutrientSuffix = perServing ? "_serving" : "_100g";

        food.setBarcode(barcode);
        food.setName(name);
        food.setBrand(brand.isBlank() ? null : brand);
        food.setMeasurementType(measurementType);
        food.setNutritionBasisQuantity(basisQuantity);
        food.setNutritionBasisUnit(basisUnit);
        food.setServingSize(basisQuantity);
        food.setServingUnit(basisUnit);
        if (packageSize != null) { food.setPackageQuantity(packageSize.quantity); food.setPackageUnit(packageSize.unit); }
        if (servingSize != null) { food.setSuggestedServingQuantity(servingSize.quantity); food.setSuggestedServingUnit(servingSize.unit); }
        food.setIngredientsText(product.path("ingredients_text").asText("").trim());
        food.setAllergenTags(join(product.path("allergens_tags")));
        food.setDietaryTags(join(product.path("ingredients_analysis_tags")));
        food.setCalories(nutrient(nutrients, "energy-kcal" + nutrientSuffix, "energy-kcal_100g"));
        food.setProtein(nutrient(nutrients, "proteins" + nutrientSuffix, "proteins_100g"));
        food.setCarbohydrates(nutrient(nutrients, "carbohydrates" + nutrientSuffix, "carbohydrates_100g"));
        food.setFat(nutrient(nutrients, "fat" + nutrientSuffix, "fat_100g"));
        food.setFibre(nutrient(nutrients, "fiber" + nutrientSuffix, "fiber_100g"));
        food.setSugar(nutrient(nutrients, "sugars" + nutrientSuffix, "sugars_100g"));
        food.setSaturatedFat(nutrient(nutrients, "saturated-fat" + nutrientSuffix, "saturated-fat_100g"));
        return food;
    }

    private UnitQuantity quantity(JsonNode product, String valueField, String unitField) {
        JsonNode value = product.path(valueField);
        String rawUnit = product.path(unitField).asText("").trim();
        if (!value.isNumber() || value.asDouble() <= 0 || rawUnit.isBlank()) return null;
        double amount = value.asDouble();
        String unit = normalizeUnit(rawUnit);
        if (unit == null) return null;
        if (rawUnit.equalsIgnoreCase("l")) amount *= 1000;
        else if (rawUnit.equalsIgnoreCase("cl")) amount *= 10;
        else if (rawUnit.equalsIgnoreCase("kg")) amount *= 1000;
        return new UnitQuantity(round(amount), unit);
    }

    private String normalizeUnit(String unit) {
        return switch (unit.trim().toLowerCase(Locale.ROOT)) {
            case "ml", "millilitre", "milliliter", "l", "cl" -> "mL";
            case "g", "gram", "grams", "kg" -> "g";
            case "serving", "portion" -> "serving";
            case "unit", "piece", "pieces", "item" -> "unit";
            default -> null;
        };
    }

    private String measurementType(String unit) {
        if (unit == null) return "UNKNOWN";
        return switch (unit) { case "mL" -> "LIQUID"; case "g" -> "SOLID"; case "serving", "unit" -> "SERVING"; default -> "UNKNOWN"; };
    }

    private boolean hasNutrient(JsonNode nutrients, String key) { return nutrients.path(key).isNumber(); }
    private double nutrient(JsonNode nutrients, String preferred, String fallback) {
        JsonNode value = nutrients.path(preferred);
        return round(value.isNumber() ? value.asDouble() : nutrients.path(fallback).asDouble(0));
    }
    private String firstNonBlank(String... values) { for (String value : values) if (value != null && !value.isBlank()) return value; return null; }
    private double round(double value) { return Math.round(value * 100d) / 100d; }
    private String join(JsonNode values) { List<String> items = new ArrayList<>(); values.forEach(value -> items.add(value.asText())); return String.join(",", items); }
    private record UnitQuantity(double quantity, String unit) {}
}
