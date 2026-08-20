package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "goals", indexes = {
    @Index(name = "idx_goal_user_status", columnList = "user_id,status"),
    @Index(name = "idx_goal_user_target_date", columnList = "user_id,target_date")
})
@Getter @Setter @NoArgsConstructor
public class Goal extends BaseEntity {
    public enum Type { WEIGHT, BODY_FAT, WAIST, PROTEIN, CALORIES, WATER, SLEEP, WORKOUT_FREQUENCY, STREAK }
    public enum Status { ACTIVE, COMPLETED, PAUSED, FAILED, ARCHIVED }
    public enum Direction { DECREASE, INCREASE, MAINTAIN, AT_LEAST, AT_MOST }

    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40) private Type type;
    @Column(nullable = false, length = 140) private String title;
    private Double startValue;
    @Column(nullable = false) private Double targetValue;
    @Column(nullable = false, length = 20) private String unit;
    @Column(nullable = false) private LocalDate startDate;
    private LocalDate targetDate;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status status = Status.ACTIVE;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Direction direction;
    private LocalDate completedDate;
}
