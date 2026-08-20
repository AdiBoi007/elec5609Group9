package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "grocery_lists") @Getter @Setter @NoArgsConstructor
public class GroceryList extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @ManyToOne @JoinColumn(name = "meal_plan_id") private GeneratedMealPlan mealPlan;
    @Column(nullable = false) private String name;
    @OneToMany(mappedBy = "groceryList", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC") private List<GroceryItem> items = new ArrayList<>();
}
