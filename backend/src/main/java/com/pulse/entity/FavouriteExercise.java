package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "exercise_id"}))
@Getter @Setter @NoArgsConstructor
public class FavouriteExercise extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @ManyToOne(optional = false) @JoinColumn(name = "exercise_id") private Exercise exercise;
}
