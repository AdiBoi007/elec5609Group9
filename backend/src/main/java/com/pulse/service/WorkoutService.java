package com.pulse.service;

import com.pulse.entity.*;
import com.pulse.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class WorkoutService {
    private final WorkoutRepository workouts;
    private final ExerciseRepository exercises;
    private final UserRepository users;

    @Transactional(readOnly = true)
    public List<WorkoutSummary> history(String email) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        return workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(user.getId(), LocalDateTime.now().minusYears(1), LocalDateTime.now().plusDays(1)).stream().map(this::summary).toList();
    }
    @Transactional
    public WorkoutSummary create(String email, CreateWorkoutRequest request) {
        Workout workout = new Workout(); workout.setUser(users.findByEmailIgnoreCase(email).orElseThrow()); workout.setName(request.name()); workout.setStartedAt(request.startedAt() == null ? LocalDateTime.now() : request.startedAt()); workout.setDurationMinutes(request.durationMinutes()); workout.setNotes(request.notes());
        for (ExerciseInput input : request.exercises()) {
            boolean strengthEntry = input.sets() != null || input.reps() != null || input.weightKg() != null;
            if (!strengthEntry && input.durationSeconds() == null) throw new IllegalArgumentException("Each exercise needs sets and reps or a duration");
            if (strengthEntry && (input.sets() == null || input.reps() == null)) throw new IllegalArgumentException("Strength exercises need both sets and reps");
            Exercise exercise = exercises.findById(input.exerciseId()).orElseThrow(() -> new IllegalArgumentException("Exercise not found: " + input.exerciseId()));
            WorkoutExercise item = new WorkoutExercise(); item.setWorkout(workout); item.setExercise(exercise); item.setSets(input.sets()); item.setReps(input.reps()); item.setWeightKg(input.weightKg()); item.setDurationSeconds(input.durationSeconds()); item.setNotes(input.notes()); workout.getExercises().add(item);
        }
        return summary(workouts.save(workout));
    }
    @Transactional(readOnly = true)
    public PersonalRecords records(String email) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        List<Workout> data = workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(user.getId(), LocalDateTime.now().minusYears(5), LocalDateTime.now().plusDays(1));
        Map<String, Double> highestWeights = new TreeMap<>();
        double highestVolume = 0; String highestSession = null;
        Map<String, Long> weekly = data.stream().collect(Collectors.groupingBy(workout -> workout.getStartedAt().toLocalDate().with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString(), Collectors.counting()));
        SortedSet<LocalDate> dates = new TreeSet<>(); int longest = 0, running = 0; LocalDate previous = null;
        for (Workout workout : data) {
            dates.add(workout.getStartedAt().toLocalDate()); double volume = volume(workout);
            if (volume > highestVolume) { highestVolume = volume; highestSession = workout.getName(); }
            workout.getExercises().forEach(item -> { if (item.getWeightKg() != null) highestWeights.merge(item.getExercise().getName(), item.getWeightKg(), Math::max); });
        }
        for (LocalDate date : dates) { running = previous != null && date.equals(previous.plusDays(1)) ? running + 1 : 1; longest = Math.max(longest, running); previous = date; }
        List<ExerciseRecord> exerciseRecords = highestWeights.entrySet().stream().sorted(Map.Entry.<String,Double>comparingByValue().reversed()).limit(5).map(entry -> new ExerciseRecord(entry.getKey(), entry.getValue())).toList();
        return new PersonalRecords(exerciseRecords, round(highestVolume), highestSession, weekly.values().stream().mapToLong(Long::longValue).max().orElse(0), longest);
    }
    @Transactional(readOnly = true)
    public WorkoutDetail detail(String email, Long id) { return detailResponse(owned(email, id)); }
    @Transactional
    public WorkoutSummary repeat(String email, Long id) {
        Workout source = owned(email, id);
        Workout copy = new Workout();
        copy.setUser(source.getUser());
        copy.setName(source.getName());
        copy.setStartedAt(LocalDateTime.now());
        copy.setDurationMinutes(source.getDurationMinutes());
        copy.setNotes(source.getNotes());
        source.getExercises().forEach(item -> {
            WorkoutExercise next = new WorkoutExercise();
            next.setWorkout(copy);
            next.setExercise(item.getExercise());
            next.setSets(item.getSets());
            next.setReps(item.getReps());
            next.setWeightKg(item.getWeightKg());
            next.setDurationSeconds(item.getDurationSeconds());
            next.setNotes(item.getNotes());
            copy.getExercises().add(next);
        });
        return summary(workouts.save(copy));
    }
    @Transactional
    public void delete(String email, Long id) { workouts.delete(owned(email, id)); }
    private Workout owned(String email, Long id) { Workout workout = workouts.findById(id).orElseThrow(() -> new IllegalArgumentException("Workout not found")); if (!workout.getUser().getEmail().equalsIgnoreCase(email)) throw new IllegalArgumentException("Workout not found"); return workout; }
    private WorkoutDetail detailResponse(Workout workout) { return new WorkoutDetail(workout.getId(), workout.getName(), workout.getStartedAt(), workout.getDurationMinutes(), workout.getNotes(), workout.getExercises().stream().map(item -> new WorkoutExerciseDetail(item.getId(), item.getExercise().getId(), item.getExercise().getName(), item.getSets(), item.getReps(), item.getWeightKg(), item.getDurationSeconds(), item.getNotes())).toList()); }
    private WorkoutSummary summary(Workout w) { String muscles = w.getExercises().stream().map(item -> item.getExercise().getMuscleGroup()).filter(Objects::nonNull).distinct().limit(4).collect(Collectors.joining(" · ")); return new WorkoutSummary(w.getId(), w.getName(), w.getStartedAt(), w.getDurationMinutes(), w.getExercises().size(), w.getNotes(), round(volume(w)), muscles); }
    private double volume(Workout workout) { return workout.getExercises().stream().mapToDouble(item -> value(item.getSets()) * value(item.getReps()) * value(item.getWeightKg())).sum(); }
    private int value(Integer value) { return value == null ? 0 : value; }
    private double value(Double value) { return value == null ? 0 : value; }
    private double round(double value) { return Math.round(value * 10d) / 10d; }
    public record CreateWorkoutRequest(@NotBlank @Size(max = 150) String name,
        @PastOrPresent LocalDateTime startedAt, @NotNull @Min(1) @Max(1440) Integer durationMinutes,
        @Size(max = 2000) String notes, @NotEmpty @Valid List<ExerciseInput> exercises) {}
    public record ExerciseInput(@NotNull @Positive Long exerciseId,
        @Min(1) @Max(100) Integer sets, @Min(1) @Max(1000) Integer reps,
        @DecimalMin("0.0") @DecimalMax("1000.0") Double weightKg,
        @Min(1) @Max(86400) Integer durationSeconds, @Size(max = 1000) String notes) {}
    public record WorkoutSummary(Long id, String name, LocalDateTime startedAt, Integer durationMinutes, int exerciseCount, String notes, double trainingVolumeKg, String muscleGroups) {}
    public record WorkoutExerciseDetail(Long id, Long exerciseId, String name, Integer sets, Integer reps, Double weightKg, Integer durationSeconds, String notes) {}
    public record WorkoutDetail(Long id, String name, LocalDateTime startedAt, Integer durationMinutes, String notes, List<WorkoutExerciseDetail> exercises) {}
    public record ExerciseRecord(String exercise, double highestWeightKg) {}
    public record PersonalRecords(List<ExerciseRecord> exerciseRecords, double highestSessionVolumeKg, String highestVolumeSession, long mostWorkoutsInWeek, int longestWorkoutStreak) {}
}
