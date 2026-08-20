package com.pulse.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.entity.Food;
import com.pulse.repository.FoodRepository;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class FoodLookupServiceTest {
    @Test void returnsCachedBarcodeWithoutExternalCall() {
        FoodRepository foods = mock(FoodRepository.class); Food cached = new Food(); cached.setBarcode("1234567890123"); cached.setName("Cached food"); cached.setMeasurementType("SOLID"); cached.setNutritionBasisQuantity(100d); cached.setNutritionBasisUnit("g"); when(foods.findByBarcode(cached.getBarcode())).thenReturn(Optional.of(cached));
        Food result = new FoodLookupService(foods).findByBarcode(cached.getBarcode());
        assertThat(result.getName()).isEqualTo("Cached food"); verify(foods).findByBarcode(cached.getBarcode()); verifyNoMoreInteractions(foods);
    }

    @Test void normalizesLiquidAgainstMillilitresAndPackageSize() throws Exception {
        Food food = service().normalizeProduct("930000000001", new ObjectMapper().readTree("""
            {"product_name":"Protein coffee","product_quantity":500,"product_quantity_unit":"ml","serving_quantity":250,"serving_quantity_unit":"ml","nutrition_data_per":"100ml","nutriments":{"energy-kcal_100g":59,"proteins_100g":6,"carbohydrates_100g":5,"fat_100g":2}}
            """), new Food());
        assertThat(food.getMeasurementType()).isEqualTo("LIQUID");
        assertThat(food.getNutritionBasisQuantity()).isEqualTo(100);
        assertThat(food.getNutritionBasisUnit()).isEqualTo("mL");
        assertThat(food.getPackageQuantity()).isEqualTo(500);
        assertThat(food.getSuggestedServingQuantity()).isEqualTo(250);
        assertThat(food.getCalories()).isEqualTo(59);
    }

    @Test void normalizesSolidAgainstGrams() throws Exception {
        Food food = service().normalizeProduct("930000000002", new ObjectMapper().readTree("""
            {"product_name":"Oat bar","product_quantity":60,"product_quantity_unit":"g","nutrition_data_per":"100g","nutriments":{"energy-kcal_100g":410,"proteins_100g":12}}
            """), new Food());
        assertThat(food.getMeasurementType()).isEqualTo("SOLID");
        assertThat(food.getNutritionBasisUnit()).isEqualTo("g");
        assertThat(food.getPackageQuantity()).isEqualTo(60);
    }

    @Test void usesNutritionBasisWhenPackageQuantityIsMissing() throws Exception {
        Food food = service().normalizeProduct("930000000005", new ObjectMapper().readTree("""
            {"product_name":"Pantry spread","nutrition_data_per":"100g","nutriments":{"energy-kcal_100g":539,"proteins_100g":6.3}}
            """), new Food());
        assertThat(food.getMeasurementType()).isEqualTo("SOLID");
        assertThat(food.getNutritionBasisQuantity()).isEqualTo(100);
        assertThat(food.getNutritionBasisUnit()).isEqualTo("g");
        assertThat(food.getPackageQuantity()).isNull();
    }

    @Test void preservesServingBasedNutritionWhenAvailable() throws Exception {
        Food food = service().normalizeProduct("930000000003", new ObjectMapper().readTree("""
            {"product_name":"Soup sachet","serving_quantity":1,"serving_quantity_unit":"serving","nutrition_data_per":"serving","nutriments":{"energy-kcal_serving":180,"proteins_serving":9,"energy-kcal_100g":360}}
            """), new Food());
        assertThat(food.getMeasurementType()).isEqualTo("SERVING");
        assertThat(food.getNutritionBasisQuantity()).isEqualTo(1);
        assertThat(food.getNutritionBasisUnit()).isEqualTo("serving");
        assertThat(food.getCalories()).isEqualTo(180);
    }

    @Test void reportsUnknownMeasurementWhenMetadataIsMissing() throws Exception {
        Food food = service().normalizeProduct("930000000004", new ObjectMapper().readTree("""
            {"product_name":"Mystery product","nutriments":{"energy-kcal_100g":100}}
            """), new Food());
        assertThat(food.getMeasurementType()).isEqualTo("UNKNOWN");
        assertThat(food.getNutritionBasisQuantity()).isEqualTo(100);
        assertThat(food.getNutritionBasisUnit()).isEqualTo("g");
        assertThat(food.getPackageQuantity()).isNull();
    }

    private FoodLookupService service() { return new FoodLookupService(mock(FoodRepository.class)); }
}
