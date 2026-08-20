package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Getter @Setter @NoArgsConstructor
public class SleepLog extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private Integer quality;
    @Column(length = 1000) private String notes;
}
