package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @Setter @NoArgsConstructor
public class WorkoutExercise extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "workout_id") private Workout workout;
    @ManyToOne(optional = false) @JoinColumn(name = "exercise_id") private Exercise exercise;
    private Integer sets;
    private Integer reps;
    private Double weightKg;
    private Integer durationSeconds;
    @Column(length = 1000) private String notes;
}
