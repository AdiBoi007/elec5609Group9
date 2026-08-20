package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Getter @Setter @NoArgsConstructor
public class Notification extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false) private String type;
    @Column(nullable = false) private String title;
    @Column(nullable = false, length = 1000) private String message;
    private Instant readAt;
}
