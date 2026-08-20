package com.pulse.service;

import com.pulse.entity.Goal.Direction;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class GoalMathTest {
    @Test void decreaseGoalMovesFromZeroToOneHundred() {
        assertThat(GoalMath.directionalProgress(80, 75, 70, Direction.DECREASE)).isEqualTo(50);
        assertThat(GoalMath.directionalProgress(80, 70, 70, Direction.DECREASE)).isEqualTo(100);
    }

    @Test void increaseGoalMovesFromZeroToOneHundred() {
        assertThat(GoalMath.directionalProgress(100, 125, 150, Direction.INCREASE)).isEqualTo(50);
    }

    @Test void progressIsClampedWhenValueMovesBeyondEitherBoundary() {
        assertThat(GoalMath.directionalProgress(80, 65, 70, Direction.DECREASE)).isEqualTo(100);
        assertThat(GoalMath.directionalProgress(80, 85, 70, Direction.DECREASE)).isZero();
    }

    @Test void startEqualToTargetDoesNotDivideByZero() {
        assertThat(GoalMath.directionalProgress(70, 70, 70, Direction.MAINTAIN)).isEqualTo(100);
        assertThat(GoalMath.directionalProgress(70, 75, 70, Direction.MAINTAIN)).isZero();
    }

    @Test void maintainUsesTransparentTwoPercentTolerance() {
        assertThat(GoalMath.targetReached(101.5, 100, Direction.MAINTAIN)).isTrue();
        assertThat(GoalMath.targetReached(102.1, 100, Direction.MAINTAIN)).isFalse();
    }

    @Test void projectionUsesObservedWeeklyPace() {
        LocalDate latest = LocalDate.of(2026, 8, 20);
        assertThat(GoalMath.projectedDate(latest, 75, 70, -1)).isEqualTo(LocalDate.of(2026, 9, 24));
    }

    @Test void projectionRequiresPaceTowardTarget() {
        LocalDate latest = LocalDate.of(2026, 8, 20);
        assertThat(GoalMath.projectedDate(latest, 75, 70, 0)).isNull();
        assertThat(GoalMath.projectedDate(latest, 75, 70, 1)).isNull();
    }

    @Test void projectionRejectsImplausiblyLongEstimates() {
        assertThat(GoalMath.projectedDate(LocalDate.of(2026, 8, 20), 100, 1, -.01)).isNull();
    }

    @Test void trackStatusHonoursProjectionWindow() {
        LocalDate start = LocalDate.of(2026, 7, 1);
        LocalDate target = LocalDate.of(2026, 10, 1);
        assertThat(GoalMath.trackStatus(50, start, target, LocalDate.of(2026, 9, 20), true)).isEqualTo("AHEAD");
        assertThat(GoalMath.trackStatus(50, start, target, LocalDate.of(2026, 10, 3), true)).isEqualTo("ON_TRACK");
        assertThat(GoalMath.trackStatus(50, start, target, LocalDate.of(2026, 10, 12), true)).isEqualTo("BEHIND");
    }

    @Test void missingDataAndCompletedGoalsHaveExplicitStatuses() {
        LocalDate today = LocalDate.now();
        assertThat(GoalMath.trackStatus(0, today.minusDays(10), today.plusDays(10), null, false)).isEqualTo("NO_DATA");
        assertThat(GoalMath.trackStatus(100, today.minusDays(10), today.plusDays(10), null, true)).isEqualTo("COMPLETED");
    }
}
