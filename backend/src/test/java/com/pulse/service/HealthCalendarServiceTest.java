package com.pulse.service;

import com.pulse.dto.ProgressDtos.*;
import com.pulse.entity.*;
import com.pulse.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HealthCalendarServiceTest {
    @Mock UserRepository users;
    @Mock WorkoutRepository workouts;
    @Mock MealRepository meals;
    @Mock WaterLogRepository waterLogs;
    @Mock SleepLogRepository sleepLogs;
    @Mock BodyMeasurementRepository measurements;
    @Mock StreakService streakService;
    HealthCalendarService service;
    User user;

    @BeforeEach
    void setUp() {
        user = new User(); user.setId(42L); user.setEmail("owner@example.com");
        UserProfile profile = new UserProfile(); profile.setCalorieTarget(2200); profile.setProteinTarget(150);
        profile.setCarbTarget(250); profile.setFatTarget(70); profile.setHydrationTargetMl(2500); user.setProfile(profile);
        lenient().when(users.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
        lenient().when(streakService.calculate(user.getEmail())).thenReturn(new StreakSummary(4, 9, List.of(), List.of()));
        service = new HealthCalendarService(users, workouts, meals, waterLogs, sleepLogs, measurements, streakService, new NutritionTotalsCalculator());
    }

    @Test void emptyMonthReturnsNoDataForEveryDate() {
        CalendarMonth result = calendar(2026, 2);
        assertThat(result.days()).hasSize(28);
        assertThat(result.days()).allMatch(day -> day.status() == DailyStatus.NO_DATA && day.score() == 0);
        assertThat(result.summary().noDataDays()).isEqualTo(28);
        assertThat(result.summary().currentStreak()).isEqualTo(4);
    }

    @ParameterizedTest
    @CsvSource({"2250,ON_TRACK,100", "1500,PARTIAL,65", "1499,OFF_TRACK,30"})
    void hydrationThresholdsAreDeterministic(int amount, DailyStatus expected, int score) {
        WaterLog log = new WaterLog(); log.setAmountMl(amount); log.setLoggedAt(LocalDateTime.of(2026, 8, 18, 12, 0));
        when(waterLogs.findByUserIdAndLoggedAtBetween(eq(42L), any(), any())).thenReturn(List.of(log));
        CalendarDay day = calendar(2026, 8).days().get(17);
        assertThat(day.hydration().status()).isEqualTo(expected);
        assertThat(day.status()).isEqualTo(expected);
        assertThat(day.score()).isEqualTo(score);
    }

    @Test void nutritionUsesPersistedFoodTotalsAndProfileTargets() {
        Food food = food(2200, 150, 250, 70);
        Meal meal = meal(LocalDateTime.of(2026, 8, 18, 13, 0), food);
        when(meals.findByUserIdAndEatenAtBetween(eq(42L), any(), any())).thenReturn(List.of(meal));
        CalendarDay day = calendar(2026, 8).days().get(17);
        assertThat(day.nutrition().status()).isEqualTo(DailyStatus.ON_TRACK);
        assertThat(day.nutrition().calories()).isEqualTo(2200);
        assertThat(day.nutrition().protein()).isEqualTo(150);
        assertThat(day.status()).isEqualTo(DailyStatus.ON_TRACK);
    }

    @Test void loggedWorkoutContributesPositively() {
        Workout workout = new Workout(); workout.setName("Push Day"); workout.setDurationMinutes(75);
        workout.setStartedAt(LocalDateTime.of(2026, 8, 18, 17, 0));
        when(workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(eq(42L), any(), any())).thenReturn(List.of(workout));
        CalendarDay day = calendar(2026, 8).days().get(17);
        assertThat(day.activity().status()).isEqualTo(DailyStatus.ON_TRACK);
        assertThat(day.activity().entries()).extracting(ActivityItem::name).containsExactly("Push Day");
        assertThat(day.wins()).contains("Workout completed");
    }

    @Test void absenceOfWorkoutIsNeutralRatherThanOffTrack() {
        WaterLog water = new WaterLog(); water.setAmountMl(2500); water.setLoggedAt(LocalDateTime.of(2026, 8, 18, 10, 0));
        when(waterLogs.findByUserIdAndLoggedAtBetween(eq(42L), any(), any())).thenReturn(List.of(water));
        CalendarDay day = calendar(2026, 8).days().get(17);
        assertThat(day.activity().status()).isEqualTo(DailyStatus.NO_DATA);
        assertThat(day.status()).isEqualTo(DailyStatus.ON_TRACK);
    }

    @Test void bodyMeasurementNeverReducesDailyScore() {
        BodyMeasurement body = new BodyMeasurement(); body.setMeasuredOn(LocalDate.of(2026, 8, 18)); body.setWeightKg(72.4);
        when(measurements.findByUserIdAndMeasuredOnBetweenOrderByMeasuredOn(eq(42L), any(), any())).thenReturn(List.of(body));
        CalendarDay day = calendar(2026, 8).days().get(17);
        assertThat(day.body().weight()).isEqualTo(72.4);
        assertThat(day.status()).isEqualTo(DailyStatus.NO_DATA);
        assertThat(day.score()).isZero();
    }

    @Test void sleepStatusUsesWakeDateAcrossMonthBoundary() {
        SleepLog sleep = new SleepLog(); sleep.setStartedAt(LocalDateTime.of(2026, 7, 31, 23, 0));
        sleep.setEndedAt(LocalDateTime.of(2026, 8, 1, 7, 0)); sleep.setQuality(5);
        when(sleepLogs.findByUserIdAndStartedAtBetweenOrderByStartedAt(eq(42L), any(), any())).thenReturn(List.of(sleep));
        CalendarDay first = calendar(2026, 8).days().getFirst();
        assertThat(first.sleep().status()).isEqualTo(DailyStatus.ON_TRACK);
        assertThat(first.sleep().minutes()).isEqualTo(480);
    }

    @Test void monthQueriesUseExactLocalDateBoundaries() {
        calendar(2026, 8);
        ArgumentCaptor<LocalDateTime> start = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> end = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(meals).findByUserIdAndEatenAtBetween(eq(42L), start.capture(), end.capture());
        assertThat(start.getValue()).isEqualTo(LocalDateTime.of(2026, 8, 1, 0, 0));
        assertThat(end.getValue()).isEqualTo(LocalDateTime.of(2026, 9, 1, 0, 0));
    }

    @Test void allQueriesAreConstrainedToAuthenticatedOwner() {
        calendar(2026, 8);
        verify(workouts).findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(eq(42L), any(), any());
        verify(meals).findByUserIdAndEatenAtBetween(eq(42L), any(), any());
        verify(waterLogs).findByUserIdAndLoggedAtBetween(eq(42L), any(), any());
        verify(sleepLogs).findByUserIdAndStartedAtBetweenOrderByStartedAt(eq(42L), any(), any());
        verify(measurements).findByUserIdAndMeasuredOnBetweenOrderByMeasuredOn(eq(42L), any(), any());
    }

    private CalendarMonth calendar(int year, int month) { return service.get(user.getEmail(), year, month); }
    private Food food(double calories, double protein, double carbs, double fat) {
        Food food = new Food(); food.setName("Daily food"); food.setServingSize(1d); food.setServingUnit("day");
        food.setCalories(calories); food.setProtein(protein); food.setCarbohydrates(carbs); food.setFat(fat); return food;
    }
    private Meal meal(LocalDateTime eatenAt, Food food) {
        Meal meal = new Meal(); meal.setUser(user); meal.setName("Daily nutrition"); meal.setEatenAt(eatenAt);
        MealFood item = new MealFood(); item.setMeal(meal); item.setFood(food); item.setQuantity(1d); item.setUnit("day"); meal.getFoods().add(item); return meal;
    }
}
