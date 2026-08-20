package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity @Getter @Setter @NoArgsConstructor
public class BodyMeasurement extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    @Column(nullable = false) private LocalDate measuredOn;
    private Double weightKg;
    private Double chestCm;
    private Double waistCm;
    private Double hipsCm;
    private Double armsCm;
    private Double thighsCm;
    private Double bodyFatPercentage;
    @Column(length = 1000) private String notes;
}
