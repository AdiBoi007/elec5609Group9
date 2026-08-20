package com.pulse.repository;

import com.pulse.entity.GroceryList;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GroceryListRepository extends JpaRepository<GroceryList, Long> {
    List<GroceryList> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<GroceryList> findByMealPlanId(Long mealPlanId);
}
