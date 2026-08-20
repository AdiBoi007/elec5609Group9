package com.pulse.repository;

import com.pulse.entity.BodyMeasurement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
import java.time.LocalDate;

public interface BodyMeasurementRepository extends JpaRepository<BodyMeasurement, Long> {
    Optional<BodyMeasurement> findFirstByUserIdOrderByMeasuredOnDesc(Long userId);
    List<BodyMeasurement> findByUserIdOrderByMeasuredOnDesc(Long userId);
    List<BodyMeasurement> findByUserIdAndMeasuredOnBetweenOrderByMeasuredOn(Long userId, LocalDate start, LocalDate end);
}
