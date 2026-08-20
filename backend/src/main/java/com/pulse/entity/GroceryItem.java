package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @Setter @NoArgsConstructor
public class GroceryItem extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "grocery_list_id") private GroceryList groceryList;
    @Column(nullable = false) private String name;
    private Double quantity;
    private String unit;
    private String category;
    private boolean checked;
}
