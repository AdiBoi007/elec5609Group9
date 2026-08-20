package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @Setter @NoArgsConstructor
public class Exercise extends BaseEntity {
    @Column(nullable = false, unique = true) private String name;
    private String muscleGroup;
    private String equipment;
    private String difficulty;
    @Column(length = 3000) private String instructions;
    private String mediaUrl;
}
