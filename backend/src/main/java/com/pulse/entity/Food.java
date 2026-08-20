package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @Setter @NoArgsConstructor
public class Food extends BaseEntity {
    @Column(nullable = false) private String name;
    @Column(unique = true) private String barcode;
    private String brand;
    private Double servingSize;
    private String servingUnit;
    private String measurementType;
    private Double nutritionBasisQuantity;
    private String nutritionBasisUnit;
    private Double packageQuantity;
    private String packageUnit;
    private Double suggestedServingQuantity;
    private String suggestedServingUnit;
    private Double calories;
    private Double protein;
    private Double carbohydrates;
    private Double fat;
    private Double fibre;
    private Double sugar;
    private Double saturatedFat;
    private boolean customFood;
    @Column(length = 5000) private String ingredientsText;
    @Column(length = 2000) private String allergenTags;
    @Column(length = 2000) private String dietaryTags;
    @ManyToOne @JoinColumn(name = "owner_id") private User owner;
}
