package com.pulse.repository;

import com.pulse.entity.Food;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface FoodRepository extends JpaRepository<Food, Long> {
    Optional<Food> findByBarcode(String barcode);
    @Query("select f from Food f where (f.owner is null or f.owner.id = :userId) and lower(f.name) like lower(concat('%', :query, '%')) order by f.name")
    List<Food> searchAvailable(@Param("userId") Long userId, @Param("query") String query);
}
