package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity @Getter @Setter @NoArgsConstructor
public class Workout extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false) private String name;
    private LocalDateTime startedAt;
    private Integer durationMinutes;
    @Column(length = 2000) private String notes;
    @OneToMany(mappedBy = "workout", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "exercise_order") private List<WorkoutExercise> exercises = new ArrayList<>();
}
