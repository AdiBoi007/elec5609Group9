package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "app_users")
@Getter @Setter @NoArgsConstructor
public class User extends BaseEntity {
    @Column(nullable = false, length = 100) private String name;
    @Column(nullable = false, unique = true, length = 180) private String email;
    @Column private String passwordHash;
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true) private UserProfile profile;
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true) private List<Workout> workouts = new ArrayList<>();
}
