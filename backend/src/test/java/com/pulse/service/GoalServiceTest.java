package com.pulse.service;

import com.pulse.dto.GoalDtos.GoalRequest;
import com.pulse.entity.*;
import com.pulse.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class GoalServiceTest {
    private GoalRepository goals;
    private UserRepository users;
    private BodyMeasurementRepository measurements;
    private MealRepository meals;
    private WaterLogRepository waterLogs;
    private SleepLogRepository sleepLogs;
    private WorkoutRepository workouts;
    private StreakService streaks;
    private GoalService service;
    private User owner;

    @BeforeEach void setUp() {
        goals = mock(GoalRepository.class);
        users = mock(UserRepository.class);
        owner = new User(); owner.setId(7L); owner.setEmail("owner@example.com");
        UserProfile profile = new UserProfile(); profile.setProteinTarget(150); profile.setCalorieTarget(2200); profile.setHydrationTargetMl(2500); owner.setProfile(profile);
        measurements = mock(BodyMeasurementRepository.class); meals = mock(MealRepository.class);
        waterLogs = mock(WaterLogRepository.class); sleepLogs = mock(SleepLogRepository.class);
        workouts = mock(WorkoutRepository.class); streaks = mock(StreakService.class);
        when(users.findByEmailIgnoreCase(owner.getEmail())).thenReturn(Optional.of(owner));
        when(goals.save(any(Goal.class))).thenAnswer(invocation -> invocation.getArgument(0));
        service = new GoalService(goals, users, measurements, meals, waterLogs, sleepLogs, workouts,
            streaks, new NutritionTotalsCalculator());
        clearInvocations(goals);
    }

    @Test void goalLookupIsConstrainedToAuthenticatedUser() {
        when(goals.findByIdAndUserId(99L, 7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(owner.getEmail(), 99L))
            .isInstanceOf(IllegalArgumentException.class).hasMessage("Goal not found");
        verify(goals).findByIdAndUserId(99L, 7L);
        verify(goals, never()).findById(99L);
    }

    @Test void rejectsFutureStartDateBeforeWritingAnything() {
        GoalRequest request = new GoalRequest(Goal.Type.WATER, "Hydration", 2500d, "mL/day",
            LocalDate.now().plusDays(1), LocalDate.now().plusDays(30), Goal.Direction.AT_LEAST);
        assertThatThrownBy(() -> service.create(owner.getEmail(), request))
            .isInstanceOf(IllegalArgumentException.class).hasMessage("Start date cannot be in the future");
        verifyNoInteractions(goals);
    }

    @Test void rejectsTargetDateThatDoesNotFollowStartDate() {
        LocalDate start = LocalDate.now().minusDays(1);
        GoalRequest request = new GoalRequest(Goal.Type.PROTEIN, "Protein", 150d, "g/day",
            start, start, Goal.Direction.AT_LEAST);
        assertThatThrownBy(() -> service.create(owner.getEmail(), request))
            .isInstanceOf(IllegalArgumentException.class).hasMessage("Target date must be after the start date");
        verifyNoInteractions(goals);
    }

    @Test void workoutFrequencyUsesOnlyCurrentWeekSessions() {
        List<Workout> sessions = List.of(workout(0), workout(1), workout(2));
        when(workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(eq(7L), any(), any())).thenReturn(sessions);
        var result = service.create(owner.getEmail(), request(Goal.Type.WORKOUT_FREQUENCY, 4, "workouts/week"));
        assertThat(result.currentValue()).isEqualTo(3);
        assertThat(result.progress()).isEqualTo(75);
    }

    @Test void proteinConsistencyCountsTargetDaysRatherThanInventingAnAverage() {
        List<Meal> data = new ArrayList<>();
        for (int offset = 0; offset < 5; offset++) data.add(meal(LocalDate.now().minusDays(offset), 150));
        when(meals.findByUserIdAndEatenAtBetween(eq(7L), any(), any())).thenReturn(data);
        var result = service.create(owner.getEmail(), request(Goal.Type.PROTEIN, 150, "g/day"));
        assertThat(result.progress()).isEqualTo(71.4);
        assertThat(result.methodology()).contains("last seven days");
    }

    @Test void waterGoalUsesSevenDayAdherence() {
        List<WaterLog> data = new ArrayList<>();
        for (int offset = 0; offset < 6; offset++) {
            WaterLog log = new WaterLog(); log.setAmountMl(2500); log.setLoggedAt(LocalDate.now().minusDays(offset).atTime(12, 0)); data.add(log);
        }
        when(waterLogs.findByUserIdAndLoggedAtBetween(eq(7L), any(), any())).thenReturn(data);
        var result = service.create(owner.getEmail(), request(Goal.Type.WATER, 2500, "mL/day"));
        assertThat(result.progress()).isEqualTo(85.7);
    }

    @Test void sleepGoalUsesPersistedSevenDayAverage() {
        SleepLog first = sleep(LocalDate.now(), 8, 4); SleepLog second = sleep(LocalDate.now().minusDays(1), 6, 3);
        when(sleepLogs.findByUserIdAndStartedAtBetweenOrderByStartedAt(eq(7L), any(), any())).thenReturn(List.of(first, second));
        var result = service.create(owner.getEmail(), request(Goal.Type.SLEEP, 8, "hours"));
        assertThat(result.currentValue()).isEqualTo(7);
        assertThat(result.progress()).isEqualTo(87.5);
    }

    @Test void streakGoalDelegatesToExistingStreakService() {
        when(streaks.calculate(owner.getEmail())).thenReturn(new com.pulse.dto.ProgressDtos.StreakSummary(12, 20, List.of(), List.of()));
        var result = service.create(owner.getEmail(), request(Goal.Type.STREAK, 30, "days"));
        assertThat(result.currentValue()).isEqualTo(12);
        assertThat(result.progress()).isEqualTo(40);
    }

    @Test void reachingDirectionalGoalMarksItCompleted() {
        BodyMeasurement measurement = new BodyMeasurement(); measurement.setMeasuredOn(LocalDate.now()); measurement.setWeightKg(68d);
        when(measurements.findByUserIdOrderByMeasuredOnDesc(7L)).thenReturn(List.of(measurement));
        Goal goal = persisted(Goal.Type.WEIGHT, 72d, 68d, Goal.Direction.DECREASE);
        when(goals.findByIdAndUserId(11L, 7L)).thenReturn(Optional.of(goal));
        var result = service.get(owner.getEmail(), 11L);
        assertThat(result.status()).isEqualTo(Goal.Status.COMPLETED);
        assertThat(result.completedDate()).isEqualTo(LocalDate.now());
    }

    @Test void pauseResumeAndArchivePersistLifecycleState() {
        when(streaks.calculate(owner.getEmail())).thenReturn(new com.pulse.dto.ProgressDtos.StreakSummary(3, 5, List.of(), List.of()));
        Goal goal = persisted(Goal.Type.STREAK, 0, 30, Goal.Direction.AT_LEAST);
        when(goals.findByIdAndUserId(11L, 7L)).thenReturn(Optional.of(goal));
        assertThat(service.pause(owner.getEmail(), 11L).status()).isEqualTo(Goal.Status.PAUSED);
        assertThat(service.resume(owner.getEmail(), 11L).status()).isEqualTo(Goal.Status.ACTIVE);
        assertThat(service.archive(owner.getEmail(), 11L).status()).isEqualTo(Goal.Status.ARCHIVED);
        verify(goals, times(3)).save(goal);
    }

    private GoalRequest request(Goal.Type type, double target, String unit) {
        return new GoalRequest(type, type.name() + " goal", target, unit, LocalDate.now(), LocalDate.now().plusDays(60), Goal.Direction.AT_LEAST);
    }
    private Workout workout(int daysAgo) { Workout value = new Workout(); value.setStartedAt(LocalDateTime.now().minusDays(daysAgo)); return value; }
    private Meal meal(LocalDate date, double protein) {
        Food food = new Food(); food.setServingSize(1d); food.setProtein(protein);
        Meal meal = new Meal(); meal.setEatenAt(date.atTime(12, 0)); MealFood item = new MealFood(); item.setMeal(meal); item.setFood(food); item.setQuantity(1d); meal.getFoods().add(item); return meal;
    }
    private SleepLog sleep(LocalDate wakeDate, int hours, int quality) { SleepLog value = new SleepLog(); value.setEndedAt(wakeDate.atTime(7, 0)); value.setStartedAt(value.getEndedAt().minusHours(hours)); value.setQuality(quality); return value; }
    private Goal persisted(Goal.Type type, double start, double target, Goal.Direction direction) {
        Goal goal = new Goal(); goal.setId(11L); goal.setUser(owner); goal.setType(type); goal.setTitle("Persisted goal"); goal.setStartValue(start); goal.setTargetValue(target); goal.setUnit(type == Goal.Type.WEIGHT ? "kg" : "days"); goal.setStartDate(LocalDate.now().minusDays(30)); goal.setTargetDate(LocalDate.now().plusDays(30)); goal.setDirection(direction); goal.setStatus(Goal.Status.ACTIVE); return goal;
    }
}
