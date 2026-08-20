package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;

@Entity @Getter @Setter @NoArgsConstructor
public class Reminder extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false) private String type;
    @Column(nullable = false) private String title;
    private LocalTime reminderTime;
    private String daysOfWeek;
    private boolean enabled = true;
}
