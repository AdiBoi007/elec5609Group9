package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @Setter @NoArgsConstructor
public class MealFood extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "meal_id") private Meal meal;
    @ManyToOne(optional = false) @JoinColumn(name = "food_id") private Food food;
    private Double quantity;
    private String unit;
}
