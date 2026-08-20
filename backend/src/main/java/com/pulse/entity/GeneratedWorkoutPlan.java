package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @Setter @NoArgsConstructor
public class GeneratedWorkoutPlan extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false) private String name;
    private String goal;
    private Integer daysPerWeek;
    private boolean saved;
    @Column(columnDefinition = "text") private String planJson;
}
