package com.pulse.service;

import com.pulse.dto.ProgressDtos.*;
import com.pulse.entity.*;
import com.pulse.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProgressServiceTest {
    @Mock UserRepository users; @Mock WorkoutRepository workouts; @Mock MealRepository meals; @Mock WaterLogRepository waterLogs; @Mock SleepLogRepository sleepLogs; @Mock BodyMeasurementRepository measurements; @Mock StreakService streakService; @Spy NutritionTotalsCalculator nutritionTotals = new NutritionTotalsCalculator();
    @InjectMocks ProgressService service;

    @Test void aggregatesPersistedDomainsIntoTimeline() {
        User user = new User(); user.setId(1L); user.setEmail("demo@example.com"); UserProfile profile = new UserProfile(); profile.setCalorieTarget(2200); profile.setProteinTarget(150); profile.setHydrationTargetMl(2500); user.setProfile(profile); when(users.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        Workout workout = new Workout(); workout.setUser(user); workout.setStartedAt(LocalDateTime.now().minusHours(2)); workout.setDurationMinutes(60); WorkoutExercise set = new WorkoutExercise(); set.setWorkout(workout); set.setSets(3); set.setReps(10); set.setWeightKg(50d); workout.getExercises().add(set);
        when(workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(eq(1L),any(),any())).thenReturn(List.of(workout)); when(meals.findByUserIdAndEatenAtBetween(eq(1L),any(),any())).thenReturn(List.of());
        WaterLog water = new WaterLog(); water.setAmountMl(2500); water.setLoggedAt(LocalDateTime.now()); when(waterLogs.findByUserIdAndLoggedAtBetween(eq(1L),any(),any())).thenReturn(List.of(water));
        SleepLog sleep = new SleepLog(); sleep.setStartedAt(LocalDateTime.now().minusHours(8)); sleep.setEndedAt(LocalDateTime.now()); sleep.setQuality(4); when(sleepLogs.findByUserIdAndStartedAtBetweenOrderByStartedAt(eq(1L),any(),any())).thenReturn(List.of(sleep));
        when(measurements.findByUserIdAndMeasuredOnBetweenOrderByMeasuredOn(eq(1L),any(),any())).thenReturn(List.of()); when(measurements.findByUserIdOrderByMeasuredOnDesc(1L)).thenReturn(List.of()); when(streakService.calculate(user.getEmail())).thenReturn(new StreakSummary(3,5,List.of(),List.of()));
        ProgressSummary result = service.get(user.getEmail(), "week");
        assertThat(result.workouts().count()).isEqualTo(1); assertThat(result.workouts().trainingVolumeKg()).isEqualTo(1500); assertThat(result.hydration().goalPercentage()).isGreaterThan(0); assertThat(result.sleep().averageMinutes()).isEqualTo(480); assertThat(result.timeline()).hasSize(7);
    }
}
