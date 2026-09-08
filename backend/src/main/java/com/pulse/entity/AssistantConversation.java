package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Getter @Setter @NoArgsConstructor
public class AssistantConversation extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "user_id") private User user;
    private String title;
    private Instant lastMessageAt;
}
