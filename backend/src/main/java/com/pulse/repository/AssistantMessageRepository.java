package com.pulse.repository;

import com.pulse.entity.AssistantMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssistantMessageRepository extends JpaRepository<AssistantMessage, Long> {
    List<AssistantMessage> findByConversationIdOrderByCreatedAtAsc(Long conversationId);
    List<AssistantMessage> findTop40ByConversationIdOrderByCreatedAtDesc(Long conversationId);
    void deleteByConversationId(Long conversationId);
}
