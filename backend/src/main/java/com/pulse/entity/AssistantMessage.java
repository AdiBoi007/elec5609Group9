package com.pulse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Getter @Setter @NoArgsConstructor
public class AssistantMessage extends BaseEntity {
    @ManyToOne(optional = false) @JoinColumn(name = "conversation_id") private AssistantConversation conversation;
    @Column(nullable = false, length = 20) private String role;
    @Column(nullable = false, length = 4000) private String content;
    @Column(columnDefinition = "text") private String payload;
    private boolean generatedByAi;
}
