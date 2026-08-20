package com.pulse.service;

import com.pulse.entity.Food;
import com.pulse.entity.User;
import com.pulse.repository.FoodRepository;
import com.pulse.repository.MealRepository;
import com.pulse.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MealServiceOwnershipTest {
    @Test void rejectsAnotherUsersCustomFood() {
        MealRepository meals = mock(MealRepository.class);
        FoodRepository foods = mock(FoodRepository.class);
        UserRepository users = mock(UserRepository.class);
        User owner = new User(); owner.setId(1L); owner.setEmail("owner@example.com");
        User attacker = new User(); attacker.setId(2L); attacker.setEmail("attacker@example.com");
        Food privateFood = new Food(); privateFood.setId(10L); privateFood.setOwner(owner); privateFood.setName("Private recipe"); privateFood.setServingSize(1d);
        when(users.findByEmailIgnoreCase(attacker.getEmail())).thenReturn(Optional.of(attacker));
        when(foods.findById(privateFood.getId())).thenReturn(Optional.of(privateFood));

        MealService service = new MealService(meals, foods, users, new DietCompatibilityService());
        var request = new MealService.MealRequest("Stolen meal", "Lunch", null, false, List.of(new MealService.FoodInput(privateFood.getId(), 1, "serving")));

        assertThatThrownBy(() -> service.log(attacker.getEmail(), request)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Food not found");
    }
}
