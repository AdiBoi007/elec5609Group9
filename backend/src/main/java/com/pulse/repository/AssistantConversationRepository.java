package com.pulse.repository;

import com.pulse.entity.AssistantConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AssistantConversationRepository extends JpaRepository<AssistantConversation, Long> {
    List<AssistantConversation> findTop30ByUserIdOrderByLastMessageAtDesc(Long userId);
    List<AssistantConversation> findByUserId(Long userId);
    Optional<AssistantConversation> findByIdAndUserId(Long id, Long userId);
    void deleteByUserId(Long userId);
}
