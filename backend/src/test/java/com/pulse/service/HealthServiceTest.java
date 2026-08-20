package com.pulse.service;

import com.pulse.dto.HealthDtos.*;
import com.pulse.entity.*;
import com.pulse.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HealthServiceTest {
    @Mock UserRepository users; @Mock SleepLogRepository sleepLogs; @Mock BodyMeasurementRepository measurements; @Mock WaterLogRepository waterLogs;
    @InjectMocks HealthService service;
    private User user;

    @BeforeEach void setup() { user = new User(); user.setId(1L); user.setEmail("demo@example.com"); UserProfile profile = new UserProfile(); profile.setHydrationTargetMl(2500); user.setProfile(profile); lenient().when(users.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user)); }

    @Test void createsUpdatesAndSummarisesSleep() {
        when(sleepLogs.save(any())).thenAnswer(invocation -> { SleepLog value = invocation.getArgument(0); value.setId(10L); return value; });
        SleepRequest request = new SleepRequest(LocalDateTime.of(2026,8,17,23,0), LocalDateTime.of(2026,8,18,7,0), 4, "Good night");
        SleepResponse response = service.createSleep(user.getEmail(), request);
        assertThat(response.durationMinutes()).isEqualTo(480);
        assertThat(response.quality()).isEqualTo(4);
    }

    @Test void rejectsInvalidSleepWindow() {
        SleepRequest request = new SleepRequest(LocalDateTime.of(2026,8,18,7,0), LocalDateTime.of(2026,8,17,23,0), 4, null);
        assertThatThrownBy(() -> service.createSleep(user.getEmail(), request)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Wake time");
    }

    @Test void rejectsSleepLongerThanTwentyFourHours() {
        SleepRequest request = new SleepRequest(LocalDateTime.of(2026,8,16,7,0), LocalDateTime.of(2026,8,17,7,1), 4, null);
        assertThatThrownBy(() -> service.createSleep(user.getEmail(), request)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("24 hours");
    }

    @Test void doesNotPresentStaleSleepAsLastNight() {
        SleepLog old = new SleepLog(); old.setId(9L); old.setUser(user); old.setStartedAt(LocalDateTime.now().minusDays(4).withHour(23)); old.setEndedAt(LocalDateTime.now().minusDays(3).withHour(7)); old.setQuality(4);
        when(sleepLogs.findByUserIdOrderByStartedAtDesc(1L)).thenReturn(List.of(old));
        assertThat(service.sleepSummary(user.getEmail()).lastNightMinutes()).isZero();
    }

    @Test void createsPartialBodyMeasurementAndWaterSummary() {
        when(measurements.save(any())).thenAnswer(invocation -> { BodyMeasurement value = invocation.getArgument(0); value.setId(11L); return value; });
        BodyResponse body = service.createBody(user.getEmail(), new BodyRequest(LocalDate.of(2026,8,18), 72.4, null, 81.2, null, null, null, 17.8, "Morning"));
        assertThat(body.weightKg()).isEqualTo(72.4);
        WaterLog water = new WaterLog(); water.setUser(user); water.setAmountMl(2000); water.setLoggedAt(LocalDate.now().atTime(12,0));
        when(waterLogs.findByUserIdAndLoggedAtBetween(eq(1L), any(), any())).thenReturn(List.of(water));
        assertThat(service.waterSummary(user.getEmail()).todayMl()).isEqualTo(2000);
    }
}
