package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @Setter @NoArgsConstructor
public class GeneratedMealPlan extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false) private String name;
    private Integer calorieTarget;
    private boolean saved;
    @Column(columnDefinition = "text") private String planJson;
    @Column(columnDefinition = "text") private String groceryListJson;
}
