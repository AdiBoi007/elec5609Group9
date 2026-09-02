package com.pulse.config;

import com.pulse.dto.AiDtos.*;
import com.pulse.entity.*;
import com.pulse.repository.*;
import com.pulse.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.*;
import java.util.*;

@Configuration @Profile("!prod") @RequiredArgsConstructor
public class DataSeeder {
    private final UserRepository users;
    private final ExerciseRepository exercises;
    private final WorkoutRepository workouts;
    private final ReminderRepository reminders;
    private final BodyMeasurementRepository measurements;
    private final SleepLogRepository sleepLogs;
    private final WaterLogRepository waterLogs;
    private final MealRepository meals;
    private final FoodRepository foods;
    private final FavouriteExerciseRepository favourites;
    private final NotificationRepository notifications;
    private final GeneratedWorkoutPlanRepository workoutPlans;
    private final GeneratedMealPlanRepository mealPlans;
    private final GroceryListRepository groceryLists;
    private final GoalRepository goals;
    private final MealService mealService;
    private final PlanService planService;
    private final PasswordEncoder encoder;

    @Bean CommandLineRunner seedDemoData() {
        return args -> {
            User user = demoUser();
            seedExercises(); seedBody(user); seedSleep(user); seedWater(user); seedNutrition(user);
            seedWorkouts(user); seedFavourites(user); seedReminders(user); seedNotifications(user); seedPlans(user); seedGoals(user);
        };
    }

    private User demoUser() {
        User user = users.findByEmailIgnoreCase("adhiraj@example.com").orElseGet(() -> {
            User created = new User(); created.setName("Adhiraj Dogra"); created.setEmail("adhiraj@example.com"); created.setPasswordHash(encoder.encode("password123"));
            UserProfile profile = new UserProfile(); profile.setUser(created); profile.setAge(24); profile.setGender("Male"); profile.setHeightCm(178d); profile.setWeightKg(72.4); profile.setActivityLevel("Moderately active"); profile.setFitnessGoal(FitnessGoal.BULK); profile.setCalorieTarget(2200); profile.setProteinTarget(150); profile.setCarbTarget(250); profile.setFatTarget(70); profile.setHydrationTargetMl(2500); profile.setDietaryPreferences("Balanced, high protein"); profile.setDislikedIngredients("Olives"); profile.setDietaryPattern("OMNIVORE"); profile.getRestrictions().add("NO_PORK"); profile.getAllergies().add("PEANUTS"); profile.getDislikedFoods().add("Olives"); profile.getPreferredCuisines().addAll(List.of("INDIAN", "MEDITERRANEAN")); profile.getPreferredProteinSources().addAll(List.of("CHICKEN", "FISH", "EGGS", "DAIRY", "LENTILS")); profile.setPreferredMealsPerDay(4); profile.setMealPrepDifficulty("EASY"); profile.setMealPrepTime("MIN_15_30"); profile.setBudgetPreference("MODERATE"); created.setProfile(profile);
            return users.save(created);
        });
        UserProfile profile = user.getProfile();
        if (profile.getDietaryPattern() == null) { profile.setDietaryPattern("OMNIVORE"); profile.getRestrictions().add("NO_PORK"); profile.getAllergies().add("PEANUTS"); profile.getDislikedFoods().add("Olives"); profile.getPreferredCuisines().addAll(List.of("INDIAN", "MEDITERRANEAN")); profile.getPreferredProteinSources().addAll(List.of("CHICKEN", "FISH", "EGGS", "DAIRY", "LENTILS")); profile.setPreferredMealsPerDay(4); profile.setMealPrepDifficulty("EASY"); profile.setMealPrepTime("MIN_15_30"); profile.setBudgetPreference("MODERATE"); users.save(user); }
        return user;
    }

    private void seedExercises() {
        Map<String, String> videos = Map.ofEntries(
            Map.entry("Barbell Bench Press", "rT7DgCr-3pg"), Map.entry("Incline Dumbbell Press", "8iPEnn-ltC8"), Map.entry("Cable Fly", "Iwe6AmxVf7o"), Map.entry("Push-up", "IODxDxX7oi4"),
            Map.entry("Overhead Press", "2yjwXTZQDDI"), Map.entry("Dumbbell Lateral Raise", "3VcKaXpzqRo"), Map.entry("Face Pull", "rep-qVOkqgk"), Map.entry("Rear Delt Fly", "EA7u4Q_8HQ0"),
            Map.entry("Seated Cable Row", "GZbfZ033f74"), Map.entry("Lat Pulldown", "CAwf7n6Luuc"), Map.entry("Pull-up", "eGo4IYlbE5g"), Map.entry("Single-arm Dumbbell Row", "pYcpY20QaE8"), Map.entry("Barbell Row", "FWJR5Ve8bnQ"),
            Map.entry("Back Squat", "ultWZbUMPL8"), Map.entry("Goblet Squat", "MeIiIdhvXT4"), Map.entry("Bulgarian Split Squat", "2C-uNgKwPLE"), Map.entry("Leg Press", "IZxyjW7MPJQ"), Map.entry("Walking Lunge", "L8fvypPrzzs"),
            Map.entry("Romanian Deadlift", "jEy_czb3RKA"), Map.entry("Leg Curl", "ELOCsoDSmrg"), Map.entry("Hip Thrust", "SEdqd1n0cvg"), Map.entry("Glute Bridge", "OUgsJ8-Vi0E"),
            Map.entry("Standing Calf Raise", "gwLzBJYoWlI"), Map.entry("Seated Calf Raise", "JbyjNymZOt0"), Map.entry("Barbell Curl", "kwG2ipFRgfo"), Map.entry("Hammer Curl", "zC3nLlEvin4"),
            Map.entry("Triceps Pushdown", "2-LAMcpzODU"), Map.entry("Skull Crusher", "d_KZxkY_0cM"), Map.entry("Plank", "ASdvN_XEl_c"), Map.entry("Dead Bug", "4XLEnwUr1d8"),
            Map.entry("Hanging Knee Raise", "RD_A-Z15ER4"), Map.entry("Farmer Carry", "rt17lmnaLSM"), Map.entry("Kettlebell Swing", "YSxHifyI6s8"), Map.entry("Rowing Ergometer", "zQ82RYIFLN8"),
            Map.entry("Burpee", "dZgVxmf6jkA"), Map.entry("Box Jump", "52r_Ul5k03g"), Map.entry("Assisted Pull-up", "6i7adZVlwIk")
        );
        List<String[]> data = List.of(
            row("Barbell Bench Press", "Chest", "Barbell", "Intermediate"), row("Incline Dumbbell Press", "Chest", "Dumbbells", "Intermediate"), row("Cable Fly", "Chest", "Cable", "Beginner"), row("Push-up", "Chest", "Bodyweight", "Beginner"),
            row("Overhead Press", "Shoulders", "Barbell", "Intermediate"), row("Dumbbell Lateral Raise", "Shoulders", "Dumbbells", "Beginner"), row("Face Pull", "Shoulders", "Cable", "Beginner"), row("Rear Delt Fly", "Shoulders", "Dumbbells", "Beginner"),
            row("Seated Cable Row", "Back", "Cable", "Beginner"), row("Lat Pulldown", "Back", "Cable", "Beginner"), row("Pull-up", "Back", "Bodyweight", "Intermediate"), row("Single-arm Dumbbell Row", "Back", "Dumbbells", "Intermediate"), row("Barbell Row", "Back", "Barbell", "Advanced"),
            row("Back Squat", "Quads", "Barbell", "Intermediate"), row("Goblet Squat", "Quads", "Dumbbells", "Beginner"), row("Bulgarian Split Squat", "Quads", "Dumbbells", "Advanced"), row("Leg Press", "Quads", "Machine", "Beginner"), row("Walking Lunge", "Quads", "Dumbbells", "Intermediate"),
            row("Romanian Deadlift", "Hamstrings", "Barbell", "Intermediate"), row("Leg Curl", "Hamstrings", "Machine", "Beginner"), row("Hip Thrust", "Glutes", "Barbell", "Intermediate"), row("Glute Bridge", "Glutes", "Bodyweight", "Beginner"),
            row("Standing Calf Raise", "Calves", "Machine", "Beginner"), row("Seated Calf Raise", "Calves", "Machine", "Beginner"), row("Barbell Curl", "Biceps", "Barbell", "Beginner"), row("Hammer Curl", "Biceps", "Dumbbells", "Beginner"),
            row("Triceps Pushdown", "Triceps", "Cable", "Beginner"), row("Skull Crusher", "Triceps", "Barbell", "Intermediate"), row("Plank", "Core", "Bodyweight", "Beginner"), row("Dead Bug", "Core", "Bodyweight", "Beginner"),
            row("Hanging Knee Raise", "Core", "Bodyweight", "Intermediate"), row("Farmer Carry", "Full body", "Dumbbells", "Beginner"), row("Kettlebell Swing", "Full body", "Kettlebell", "Intermediate"), row("Rowing Ergometer", "Cardio", "Machine", "Beginner"),
            row("Stationary Bike", "Cardio", "Machine", "Beginner"), row("Burpee", "Full body", "Bodyweight", "Intermediate"), row("Box Jump", "Full body", "Box", "Advanced"), row("Assisted Pull-up", "Back", "Machine", "Beginner")
        );
        Map<String, Exercise> existing = new HashMap<>(); exercises.findAll().forEach(e -> existing.put(e.getName().toLowerCase(), e));
        for (String[] item : data) {
            Exercise exercise = existing.getOrDefault(item[0].toLowerCase(), new Exercise()); exercise.setName(item[0]); exercise.setMuscleGroup(item[1]); exercise.setEquipment(item[2]); exercise.setDifficulty(item[3]); exercise.setInstructions(exerciseInstructions(item[0])); exercise.setMediaUrl(videos.get(item[0])); exercises.save(exercise);
        }
    }

    private void seedWorkouts(User user) {
        List<Workout> existing = workouts.findByUserIdAndStartedAtBetweenOrderByStartedAtDesc(user.getId(), LocalDateTime.now().minusYears(1), LocalDateTime.now().plusDays(1));
        LocalDateTime now = LocalDateTime.now();
        existing.stream().filter(workout -> workout.getStartedAt().isAfter(now)).forEach(workout -> { workout.setStartedAt(now.minusHours(1)); workouts.save(workout); });
        List<Exercise> library = exercises.findAll();
        List<String[]> templates = List.of(row("Upper Strength", "Chest · Back · Shoulders", "72"), row("Lower Strength", "Quads · Hamstrings · Glutes", "68"), row("Push Hypertrophy", "Chest · Shoulders · Triceps", "62"), row("Pull & Core", "Back · Biceps · Core", "58"), row("Conditioning", "Full body · Cardio", "35"));
        Set<String> names = new HashSet<>(); existing.forEach(w -> names.add(w.getName()));
        for (int i = 0; i < templates.size(); i++) if (!names.contains(templates.get(i)[0])) workouts.save(seedWorkout(user, templates.get(i)[0], templates.get(i)[1], Integer.parseInt(templates.get(i)[2]), LocalDateTime.now().minusDays(i).withHour(17).withMinute(30), library.subList(i * 3, Math.min(i * 3 + 4, library.size()))));
    }

    private void seedBody(User user) {
        List<BodyMeasurement> existing = measurements.findByUserIdOrderByMeasuredOnDesc(user.getId());
        if (!existing.isEmpty()) return;
        double[] weights = {74.0, 73.6, 73.2, 72.8, 72.4}; double[] fat = {18.7, 18.5, 18.2, 18.0, 17.8}; double[] waist = {83.3, 82.7, 82.2, 81.7, 81.2};
        for (int i = 0; i < 5; i++) { LocalDate date = LocalDate.now().minusDays((4L - i) * 7); BodyMeasurement m = new BodyMeasurement(); m.setUser(user); m.setMeasuredOn(date); m.setWeightKg(weights[i]); m.setBodyFatPercentage(fat[i]); m.setWaistCm(waist[i]); m.setChestCm(100.8 + i * .15); m.setHipsCm(96.2 - i * .2); m.setArmsCm(36.4 + i * .1); m.setThighsCm(57.8 + i * .08); m.setNotes("Weekly morning check-in"); measurements.save(m); }
    }

    private void seedSleep(User user) {
        Set<LocalDate> existingDates = new HashSet<>();
        LocalDateTime now = LocalDateTime.now();
        sleepLogs.findByUserIdOrderByStartedAtDesc(user.getId()).forEach(log -> { if (log.getEndedAt().isAfter(now)) { Duration duration = Duration.between(log.getStartedAt(), log.getEndedAt()); log.setEndedAt(now.minusMinutes(1)); log.setStartedAt(log.getEndedAt().minus(duration)); sleepLogs.save(log); } existingDates.add(log.getEndedAt().toLocalDate()); });
        int[] minutes = {430, 455, 405, 470, 445, 480, 452}; int[] qualities = {4, 5, 3, 5, 4, 5, 4};
        for (int i = 0; i < 7; i++) { LocalDate wakeDate = LocalDate.now().minusDays(6L - i); if (existingDates.contains(wakeDate)) continue; LocalDateTime end = wakeDate.atTime(6, 40); SleepLog log = new SleepLog(); log.setUser(user); log.setEndedAt(end); log.setStartedAt(end.minusMinutes(minutes[i])); log.setQuality(qualities[i]); log.setNotes(i == 2 ? "Late study session" : "Consistent wind-down routine"); sleepLogs.save(log); }
    }

    private void seedWater(User user) {
        LocalDateTime start = LocalDate.now().minusDays(6).atStartOfDay(); List<WaterLog> existing = waterLogs.findByUserIdAndLoggedAtBetween(user.getId(), start, LocalDate.now().plusDays(1).atStartOfDay()); Set<LocalDate> dates = new HashSet<>(); existing.forEach(item -> dates.add(item.getLoggedAt().toLocalDate())); int[] values = {2250, 2500, 2400, 2750, 2350, 2600, 2000};
        LocalDateTime now = LocalDateTime.now(); existing.stream().filter(item -> item.getLoggedAt().isAfter(now)).forEach(item -> { item.setLoggedAt(now.minusMinutes(1)); waterLogs.save(item); });
        for (int i = 0; i < 7; i++) { LocalDate date = LocalDate.now().minusDays(6L - i); if (!dates.contains(date)) { WaterLog log = new WaterLog(); log.setUser(user); log.setAmountMl(values[i]); log.setLoggedAt(date.atTime(14, 0)); waterLogs.save(log); }}
    }

    private void seedNutrition(User user) {
        Food breakfast = food(user, "Greek yoghurt protein bowl", 650, 36, 90, 16, 9); Food lunch = food(user, "Chicken quinoa bowl", 850, 45, 125, 20, 12); Food dinner = food(user, "Miso salmon and rice", 1000, 45, 150, 20, 8); Food snack = food(user, "Banana protein yoghurt", 420, 25, 70, 8, 4);
        LocalDateTime now = LocalDateTime.now(); List<Meal> recent = meals.findByUserIdOrderByEatenAtDesc(user.getId()); int[] offset = {5}; recent.stream().filter(item -> item.getEatenAt().isAfter(now)).forEach(item -> { item.setEatenAt(now.minusMinutes(offset[0]++)); meals.save(item); });
        for (int i = 0; i < 7; i++) { LocalDate date = LocalDate.now().minusDays(6L - i); if (!meals.findByUserIdAndEatenAtBetween(user.getId(), date.atStartOfDay(), date.plusDays(1).atStartOfDay()).isEmpty()) continue; logMeal(user, breakfast, "Breakfast", date.atTime(8, 0)); logMeal(user, lunch, "Lunch", date.atTime(12, 30)); logMeal(user, dinner, "Dinner", date.atTime(19, 0)); logMeal(user, snack, "Snack", date.atTime(16, 0)); }
    }

    private void seedFavourites(User user) { if (!favourites.findByUserId(user.getId()).isEmpty()) return; exercises.findAll().stream().limit(5).forEach(exercise -> { FavouriteExercise favourite = new FavouriteExercise(); favourite.setUser(user); favourite.setExercise(exercise); favourites.save(favourite); }); }
    private void seedReminders(User user) { List<String[]> values = List.of(row("workouts", "Morning workout", "07:00", "MON,WED,FRI"), row("meals", "Log your meals", "12:30", "EVERYDAY"), row("water", "Hydration check-in", "14:00", "EVERYDAY"), row("weigh-in", "Weekly weigh-in", "08:00", "MON"), row("sleep", "Wind-down time", "22:15", "EVERYDAY")); for (String[] value : values) if (reminders.findByUserIdAndTypeIgnoreCase(user.getId(), value[0]).isEmpty()) { Reminder r = new Reminder(); r.setUser(user); r.setType(value[0]); r.setTitle(value[1]); r.setReminderTime(LocalTime.parse(value[2])); r.setDaysOfWeek(value[3]); r.setEnabled(!value[0].equals("meals")); reminders.save(r); }}
    private void seedNotifications(User user) { if (!notifications.findTop20ByUserIdOrderByCreatedAtDesc(user.getId()).isEmpty()) return; notification(user, "streak", "Seven-day momentum", "You logged meaningful health activity every day this week."); notification(user, "hydration", "Hydration check-in", "You are 500 ml away from today's target."); notification(user, "insight", "Weekly insight ready", "Your training consistency improved while body weight moved gradually toward your goal."); }
    private void seedPlans(User user) { if (workoutPlans.findByUserIdOrderByCreatedAtDesc(user.getId()).isEmpty()) planService.generateWorkout(user.getEmail(), new WorkoutPlanRequest("Muscle Gain", "Intermediate", 4, 60, List.of("Barbell", "Dumbbells", "Cable", "Machine"), "Balanced upper/lower split")); if (mealPlans.findByUserIdOrderByCreatedAtDesc(user.getId()).isEmpty()) { var plan = planService.generateMeal(user.getEmail(), new MealPlanRequest(2200, 150, 250, 70, "Balanced high protein", "None", "Olives", 4)); if (groceryLists.findByUserIdOrderByCreatedAtDesc(user.getId()).isEmpty()) planService.generateGrocery(user.getEmail(), plan.id()); }}
    private void seedGoals(User user) {
        if (!goals.findByUserIdOrderByCreatedAtDesc(user.getId()).isEmpty()) return;
        LocalDate start = LocalDate.now().minusDays(28);
        goal(user, Goal.Type.WEIGHT, "Reach 68 kg", 74d, 68d, "kg", start, LocalDate.now().plusDays(87), Goal.Direction.DECREASE);
        goal(user, Goal.Type.PROTEIN, "Protein consistency", 0d, 150d, "g/day", start, LocalDate.now().plusDays(42), Goal.Direction.AT_LEAST);
        goal(user, Goal.Type.WORKOUT_FREQUENCY, "Train four times weekly", 0d, 4d, "workouts/week", start, LocalDate.now().plusDays(70), Goal.Direction.AT_LEAST);
        goal(user, Goal.Type.WATER, "Daily hydration", 0d, 2700d, "mL/day", start, LocalDate.now().plusDays(42), Goal.Direction.AT_LEAST);
    }
    private void goal(User user, Goal.Type type, String title, double startValue, double targetValue, String unit, LocalDate startDate, LocalDate targetDate, Goal.Direction direction) { Goal goal = new Goal(); goal.setUser(user); goal.setType(type); goal.setTitle(title); goal.setStartValue(startValue); goal.setTargetValue(targetValue); goal.setUnit(unit); goal.setStartDate(startDate); goal.setTargetDate(targetDate); goal.setDirection(direction); goal.setStatus(Goal.Status.ACTIVE); goals.save(goal); }

    private Food food(User user, String name, double calories, double protein, double carbs, double fat, double fibre) {
        Food value = foods.findAll().stream().filter(item -> item.getOwner() != null && item.getOwner().getId().equals(user.getId()) && item.getName().equalsIgnoreCase(name)).findFirst().orElseGet(Food::new);
        value.setOwner(user); value.setCustomFood(true); value.setName(name); value.setServingSize(1d); value.setServingUnit("meal"); value.setCalories(calories); value.setProtein(protein); value.setCarbohydrates(carbs); value.setFat(fat); value.setFibre(fibre); value.setSugar(8d); value.setSaturatedFat(4d); return foods.save(value);
    }
    private void logMeal(User user, Food food, String type, LocalDateTime time) { mealService.log(user.getEmail(), new MealService.MealRequest(food.getName(), type, time, true, List.of(new MealService.FoodInput(food.getId(), 1, "meal")))); }
    private Workout seedWorkout(User user, String name, String notes, int duration, LocalDateTime startedAt, List<Exercise> library) { Workout workout = new Workout(); workout.setUser(user); workout.setName(name); workout.setNotes(notes); workout.setDurationMinutes(duration); workout.setStartedAt(startedAt); for (int i = 0; i < library.size(); i++) { WorkoutExercise item = new WorkoutExercise(); item.setWorkout(workout); item.setExercise(library.get(i)); item.setSets(i == 0 ? 4 : 3); item.setReps(i == 0 ? 8 : 10); item.setWeightKg(25d + i * 10); item.setNotes("Controlled working sets"); workout.getExercises().add(item); } return workout; }
    private void notification(User user, String type, String title, String message) { Notification item = new Notification(); item.setUser(user); item.setType(type); item.setTitle(title); item.setMessage(message); notifications.save(item); }
    private String exerciseInstructions(String name) {
        return switch (name) {
            case "Barbell Bench Press" -> guide("Lie with eyes under the bar, feet planted and shoulder blades gently retracted.", "Lower the bar to the lower chest, keep forearms vertical, then press up and slightly back.", "Drive your feet down while keeping your upper back set.");
            case "Incline Dumbbell Press" -> guide("Set the bench to 30–45 degrees and begin with dumbbells beside the upper chest.", "Press the weights up without clashing them, then lower until elbows sit just below the bench line.", "Keep wrists stacked over elbows.");
            case "Cable Fly" -> guide("Set handles around chest height and take a split stance with soft elbows.", "Sweep the hands together in a wide arc, pause, then return until the chest is comfortably stretched.", "Move at the shoulder; keep the elbow angle almost fixed.");
            case "Push-up" -> guide("Place hands just outside shoulder width and form a straight line from head to heels.", "Lower the chest between the hands, keep elbows angled back, then push the floor away.", "Brace as if holding a plank throughout.");
            case "Overhead Press" -> guide("Hold the bar at upper-chest height with wrists over elbows and feet planted.", "Press overhead as the head moves slightly back, finish with the bar stacked over shoulders, then lower with control.", "Keep ribs down and finish tall.");
            case "Dumbbell Lateral Raise" -> guide("Stand tall with dumbbells by the thighs and a slight bend in the elbows.", "Raise the arms out to roughly shoulder height, pause briefly, then lower slowly.", "Lead with the elbows, not the hands.");
            case "Face Pull" -> guide("Set the rope above eye level and step back until the cable is taut.", "Pull toward the forehead while separating the rope and rotating the hands beside the ears.", "Finish with elbows wide and shoulder blades together.");
            case "Rear Delt Fly" -> guide("Hinge forward with a neutral back and hold dumbbells beneath the shoulders.", "Open the arms wide with soft elbows, squeeze behind the shoulders, then return slowly.", "Keep the torso still and use a light load.");
            case "Seated Cable Row" -> guide("Sit tall with feet braced, knees soft and the handle at arm’s length.", "Drive elbows behind the torso, pause with the handle near the ribs, then reach forward without rounding.", "Keep the chest proud instead of leaning back.");
            case "Lat Pulldown" -> guide("Grip slightly wider than shoulders and sit with thighs secured under the pad.", "Pull the bar toward the upper chest by driving elbows down, then return to a full overhead reach.", "Think elbows to pockets.");
            case "Pull-up" -> guide("Hang from the bar with a firm overhand grip and a lightly braced trunk.", "Pull the chest toward the bar, clear the chin without craning, then lower to straight arms.", "Start by drawing the shoulder blades down.");
            case "Single-arm Dumbbell Row" -> guide("Brace one hand on a bench, square the hips and let the dumbbell hang below the shoulder.", "Pull the elbow toward the back pocket, pause beside the ribs, then lower to full reach.", "Avoid twisting the torso.");
            case "Barbell Row" -> guide("Hinge until the torso is near horizontal, brace firmly and hold the bar below the knees.", "Row toward the lower ribs, pause, then lower without changing the torso angle.", "Keep the bar close and your back position fixed.");
            case "Back Squat" -> guide("Set the bar securely across the upper back, brace, and stand with feet around shoulder width.", "Sit down between the hips, keep knees tracking over toes, then drive up through the whole foot.", "Keep pressure through heel, big toe and little toe.");
            case "Goblet Squat" -> guide("Hold one dumbbell close to the chest and set feet just outside hip width.", "Lower between the knees with the torso tall, pause at depth, then stand by pushing the floor away.", "Keep the weight close to your body.");
            case "Bulgarian Split Squat" -> guide("Place the rear foot on a bench and set the front foot far enough forward for balance.", "Lower the rear knee toward the floor, keep the front knee tracking over toes, then drive through the front foot.", "Let the front leg do the work.");
            case "Leg Press" -> guide("Place feet shoulder width on the platform and keep hips and back against the pad.", "Lower until the knees reach a comfortable bend, then press without locking them hard.", "Do not let the lower back curl off the pad.");
            case "Walking Lunge" -> guide("Stand tall with room ahead and hold the weights steadily at your sides.", "Step forward, lower both knees, push through the lead foot and continue into the next step.", "Keep each stride long enough for control.");
            case "Romanian Deadlift" -> guide("Hold the bar at the thighs, soften the knees and brace the trunk.", "Push hips back as the bar slides close to the legs, stop at a strong hamstring stretch, then stand tall.", "Hips travel back; the bar travels down.");
            case "Leg Curl" -> guide("Align the machine pivot with the knee and secure the pad just above the ankles.", "Curl the heels toward the body, pause, then extend the knees slowly without lifting the hips.", "Control the return for the full count.");
            case "Hip Thrust" -> guide("Rest the upper back on a bench, place the bar across the hips and plant feet firmly.", "Drive hips upward until knees, hips and shoulders align, squeeze, then lower with control.", "Finish with ribs down, not an arched back.");
            case "Glute Bridge" -> guide("Lie on the back with knees bent and feet flat near the hips.", "Press through the feet to lift the hips, squeeze the glutes, then lower until just above the floor.", "Tuck the pelvis slightly at the top.");
            case "Standing Calf Raise" -> guide("Stand tall on the platform with the balls of the feet supported and heels free.", "Lower the heels for a stretch, rise as high as possible, pause, then descend slowly.", "Move straight up instead of rolling the ankles.");
            case "Seated Calf Raise" -> guide("Sit with the pad secured above the knees and forefeet on the platform.", "Drop the heels under control, press onto the toes, pause at the top, then lower fully.", "Use the complete ankle range.");
            case "Barbell Curl" -> guide("Stand tall with an underhand grip and elbows resting beside the torso.", "Curl the bar toward the shoulders without swinging, squeeze, then lower to straight arms.", "Keep elbows pinned and wrists neutral.");
            case "Hammer Curl" -> guide("Hold dumbbells with palms facing in and shoulders relaxed.", "Curl while keeping the neutral grip, pause near the shoulders, then lower slowly.", "Do not let the elbows drift forward.");
            case "Triceps Pushdown" -> guide("Stand close to the cable with elbows bent and fixed beside the ribs.", "Press the handle down until the arms straighten, squeeze, then return without lifting the elbows.", "Only the forearms should move.");
            case "Skull Crusher" -> guide("Lie on a bench with the bar above the shoulders and elbows pointing upward.", "Bend the elbows to lower toward the forehead or just behind it, then extend without flaring.", "Keep upper arms angled and still.");
            case "Plank" -> guide("Set forearms under shoulders and extend the legs into a straight body line.", "Brace the abdomen and glutes while breathing steadily for the target time.", "Pull elbows toward toes without moving.");
            case "Dead Bug" -> guide("Lie on the back with hips and knees at 90 degrees and arms above the chest.", "Extend the opposite arm and leg while keeping the lower back gently down, then alternate.", "Only move as far as the trunk stays still.");
            case "Hanging Knee Raise" -> guide("Hang with shoulders active and legs together beneath the body.", "Curl the knees toward the chest by tilting the pelvis, pause, then lower without swinging.", "Start the lift from the abs, not momentum.");
            case "Farmer Carry" -> guide("Stand tall between heavy dumbbells, brace, and lift them with shoulders packed.", "Walk with short controlled steps while keeping the weights quiet at your sides.", "Stay tall as if balancing a book on your head.");
            case "Kettlebell Swing" -> guide("Set the bell ahead of the feet, hinge back and grip it with both hands.", "Hike it between the legs, snap the hips forward, then let it return into the next hinge.", "Power comes from the hips, not an arm raise.");
            case "Rowing Ergometer" -> guide("Strap feet in, hold the handle lightly and begin with knees bent and torso tall.", "Drive legs first, swing the torso slightly, finish with the arms; reverse that order on recovery.", "Legs, body, arms—then arms, body, legs.");
            case "Stationary Bike" -> guide("Adjust the seat so the knee stays slightly bent at the bottom of the pedal stroke.", "Pedal smoothly at the chosen resistance while keeping the upper body relaxed.", "Keep pressure even through the full circle.");
            case "Burpee" -> guide("Stand with feet around shoulder width and clear space in front of you.", "Place hands down, step or jump to a plank, return the feet, then stand or jump tall.", "Land softly and keep the plank braced.");
            case "Box Jump" -> guide("Stand a short step from a stable box with feet hip width.", "Dip quickly, swing the arms, jump onto the box and land softly with both feet before standing.", "Choose a height you can land quietly.");
            case "Assisted Pull-up" -> guide("Select assistance, place knees or feet securely and take an overhand grip.", "Pull the chest upward by driving elbows down, then lower to a full controlled reach.", "Use only enough assistance to keep clean reps.");
            default -> guide("Set a stable starting position and brace before moving.", "Use a comfortable full range and control both lifting and lowering phases.", "Stop the set when technique begins to change.");
        };
    }
    private String guide(String setup, String execution, String cue) { return "SETUP\n" + setup + "\n\nEXECUTION\n" + execution + "\n\nKEY CUE\n" + cue; }
    private String[] row(String... values) { return values; }
}
