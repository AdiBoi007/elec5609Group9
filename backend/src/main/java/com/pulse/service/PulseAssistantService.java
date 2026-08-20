package com.pulse.service;

import com.pulse.dto.DashboardSummary;
import com.pulse.dto.GoalDtos.GoalResponse;
import com.pulse.dto.ProgressDtos.*;
import com.pulse.entity.*;
import com.pulse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor
public class PulseAssistantService {
    private final DashboardService dashboard;
    private final ProgressService progress;
    private final HealthCalendarService calendar;
    private final GoalService goals;
    private final UserRepository users;
    private final AiService ai;

    @Transactional(readOnly = true)
    public PulseAnswer ask(String email, String question) {
        String q = question == null ? "" : question.trim().toLowerCase(Locale.ROOT);
        DashboardSummary today = dashboard.get(email);
        List<GoalResponse> active = goals.active(email);
        ProgressSummary week = progress.get(email, "week");
        RecoverySummary recovery = progress.recovery(email);
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("today", today);
        context.put("thisWeek", week);
        context.put("recovery", recovery);
        context.put("activeGoals", active);
        if (q.matches(".*(chest pain|faint|dizz|injur|diagnos|medication|medical|emergency).*")) {
            return answer(question, context, "Health and safety", "I can help interpret your logged wellness patterns, but I cannot assess symptoms, injuries, medication or diagnose a condition. If symptoms are severe, sudden or worrying, seek urgent medical care; otherwise speak with a qualified clinician who can assess your individual situation.",
                List.of("Your Circle Health records can be useful context to share with a clinician.", "Do not use a fitness trend or adherence score to rule out a medical concern."),
                List.of(new PulseAction("View your data", "/progress", null)));
        }
        if (q.contains("which goal") || q.contains("goal needs") || q.contains("most attention")) {
            List<GoalResponse> ranked = active.stream().sorted(Comparator
                .comparingInt((GoalResponse goal) -> attentionRank(goal.trackStatus()))
                .thenComparingDouble(GoalResponse::progress)).toList();
            if (!ranked.isEmpty()) {
                GoalResponse priority = ranked.getFirst();
                List<String> evidence = ranked.stream().limit(3)
                    .map(goal -> goal.title() + ": " + Math.round(goal.progress()) + "% · " + readable(goal.trackStatus()))
                    .toList();
                return answer(question, context, "Goal priority", priority.title() + " currently needs the most attention. Focus on the smallest repeatable action that moves this metric, then reassess after another week of consistent logging.", evidence,
                    List.of(new PulseAction("Open goals", "/goals", null)));
            }
        }
        if (q.contains("goal") && !active.isEmpty()) {
            GoalResponse priority = active.stream().min(Comparator
                .comparingInt((GoalResponse goal) -> attentionRank(goal.trackStatus()))
                .thenComparingDouble(GoalResponse::progress)).orElse(active.getFirst());
            List<String> evidence = active.stream().limit(4).map(goal -> goal.title() + ": " + Math.round(goal.progress()) + "% · " + readable(goal.trackStatus())).toList();
            return answer(question, context, "Your goals", "You have " + active.size() + " active goal" + (active.size() == 1 ? "" : "s") + ". " + priority.title() + " has the most room to move, so making its next action easy and specific is likely to create the best momentum.", evidence,
                List.of(new PulseAction("Review goals", "/goals", null), new PulseAction("Log health data", "/log", null)));
        }
        if (q.contains("protein")) {
            Optional<GoalResponse> goal = active.stream().filter(item -> item.type() == Goal.Type.PROTEIN).findFirst();
            int target = goal.map(value -> (int)Math.round(value.targetValue())).orElse(today.proteinTarget());
            int remaining = Math.max(0, target - today.protein());
            List<String> evidence = new ArrayList<>();
            evidence.add("You have logged " + today.protein() + " g against a " + target + " g target.");
            goal.ifPresent(value -> evidence.add("Seven-day goal adherence is " + Math.round(value.progress()) + "% · " + readable(value.trackStatus()) + "."));
            evidence.add("Today’s calories are " + today.calories() + " of " + today.calorieTarget() + " kcal.");
            return answer(question, context, "Protein today", remaining == 0 ? "You have reached today’s protein target. Keep the rest of today balanced rather than adding protein only for the sake of exceeding it." : "You have " + remaining + " g of protein remaining today. Split that across your remaining meals or snacks so it is easier to reach without pushing calories far beyond target.", evidence, List.of(new PulseAction("Log a meal", "/log?type=Meal", null), new PulseAction("Open nutrition", "/nutrition", null)));
        }
        if (q.contains("calorie") || q.contains("macro") || q.contains("nutrition") || q.contains("food") || q.contains("eat") || q.contains("meal")) {
            int calorieRemaining = Math.max(0, today.calorieTarget() - today.calories());
            int proteinRemaining = Math.max(0, today.proteinTarget() - today.protein());
            return answer(question, context, "Nutrition today", calorieRemaining == 0 ? "You are at or above today’s calorie target. Prioritise hunger, meal quality and your overall weekly pattern rather than trying to correct a single day aggressively." : "You have about " + calorieRemaining + " kcal and " + proteinRemaining + " g protein remaining today. A meal built around a protein source, vegetables or fruit, and a portion of carbohydrate would address the remaining targets more evenly.",
                List.of(today.calories() + " / " + today.calorieTarget() + " kcal logged", today.protein() + " / " + today.proteinTarget() + " g protein", today.carbs() + " / " + today.carbsTarget() + " g carbohydrates", today.fat() + " / " + today.fatTarget() + " g fat"),
                List.of(new PulseAction("Log a meal", "/log?type=Meal", null), new PulseAction("Review nutrition", "/nutrition", null)));
        }
        if (q.contains("water") || q.contains("hydrat")) {
            int remaining = Math.max(0, today.waterTarget() - today.water());
            int percentage = today.waterTarget() == 0 ? 0 : (int)Math.round(today.water() * 100d / today.waterTarget());
            return answer(question, context, "Hydration today", remaining == 0 ? "You have reached today’s hydration target. Continue drinking according to thirst and the demands of your activity and environment." : "You are at " + percentage + "% of today’s hydration target, with " + remaining + " ml remaining. Use comfortable increments across the rest of the day rather than trying to drink it all at once.",
                List.of(today.water() + " ml logged today", today.waterTarget() + " ml daily target", Math.round(week.hydration().averageDailyMl()) + " ml average on recorded days this week"),
                List.of(new PulseAction("Add 250 ml", null, 250), new PulseAction("Open hydration", "/water", null)));
        }
        if (q.contains("weight") || q.contains("68")) {
            Optional<GoalResponse> goal = active.stream().filter(item -> item.type() == Goal.Type.WEIGHT).findFirst();
            if (goal.isPresent()) { GoalResponse value = goal.get(); String projection = value.projectedDate() == null ? "Record more measurements to unlock a reliable trend projection." : "At the recent recorded pace, the estimated projection is " + value.projectedDate() + "."; String current = value.currentValue() == null ? "No current measurement is available" : value.currentValue() + " " + value.unit() + " recorded"; return answer(question, context, "Weight goal", "Your weight goal is " + Math.round(value.progress()) + "% complete and currently " + readable(value.trackStatus()) + ". Treat the multi-week trend as more meaningful than any single weigh-in because normal day-to-day variation can be substantial.", List.of(current + " toward " + value.targetValue() + " " + value.unit() + ".", projection, week.body().weightChange() == null ? "There is not enough in-range data to calculate this week’s change." : "Recorded change across this week: " + week.body().weightChange() + " kg."), List.of(new PulseAction("Open goal", "/goals", null), new PulseAction("Log weight", "/log?type=Body", null), new PulseAction("View body trend", "/body", null))); }
            return answer(question, context, "Weight trend", today.weight() > 0 ? "Your latest recorded weight is " + today.weight() + " kg. Add measurements under similar conditions and evaluate the trend across several weeks for a more useful signal." : "There is no recent weight measurement to analyse yet. Log a measurement to establish a baseline.", List.of("Single weigh-ins can move with hydration, meals and timing.", "Circle Health uses recorded measurements rather than estimated weight."), List.of(new PulseAction("Log weight", "/log?type=Body", null), new PulseAction("Open body", "/body", null)));
        }
        if (q.contains("workout") || q.contains("training")) {
            Optional<GoalResponse> goal = active.stream().filter(item -> item.type() == Goal.Type.WORKOUT_FREQUENCY).findFirst();
            int count = week.workouts().count();
            int duration = week.workouts().totalDurationMinutes();
            if (goal.isPresent()) { GoalResponse value = goal.get(); int remaining = Math.max(0, (int)Math.ceil(value.targetValue() - value.currentValue())); return answer(question, context, "Training this week", remaining == 0 ? "Your weekly workout goal is already satisfied. Let recovery and session quality guide any additional training rather than adding volume solely to increase the count." : "You have " + remaining + " workout" + (remaining == 1 ? "" : "s") + " remaining this week. Place them where you can train with good effort while leaving enough recovery between demanding sessions.", List.of(Math.round(value.currentValue()) + " of " + Math.round(value.targetValue()) + " planned sessions are complete.", duration + " total training minutes logged this week.", Math.round(week.workouts().trainingVolumeKg()) + " kg recorded training volume."), List.of(new PulseAction("Log workout", "/log?type=Workout", null), new PulseAction("Open workouts", "/workouts", null), new PulseAction("View goal", "/goals", null))); }
            return answer(question, context, "Training this week", "You have completed " + count + " workout" + (count == 1 ? "" : "s") + " this week. Use consistency, recovery and progression in your main exercises as the primary signals—not session count alone.", List.of(duration + " total training minutes", Math.round(week.workouts().trainingVolumeKg()) + " kg recorded volume", recovery.trainingLoadScore() + "/100 training-load contribution to recovery"), List.of(new PulseAction("Open workouts", "/workouts", null), new PulseAction("Log workout", "/log?type=Workout", null)));
        }
        if (q.contains("yesterday") || q.contains("off track") || q.contains("tuesday")) {
            LocalDate date = q.contains("yesterday") ? LocalDate.now().minusDays(1) : LocalDate.now();
            CalendarDay day = calendar.get(email, date.getYear(), date.getMonthValue()).days().stream().filter(item -> item.date().equals(date)).findFirst().orElse(null);
            if (day != null) return answer(question, context, "Daily adherence", date + " was " + readable(day.status().name()) + " with a score of " + day.score() + "/100. " + (day.attentionAreas().isEmpty() ? "The logged categories were generally aligned with your targets." : "The clearest opportunities are the categories listed below; focus on the most controllable one first."), day.attentionAreas().isEmpty() ? day.wins() : day.attentionAreas(), List.of(new PulseAction("Open calendar", "/progress", null), new PulseAction("Log health data", "/log", null)));
        }
        if (q.contains("sleep") || q.contains("recovery")) {
            double averageHours = week.sleep().averageMinutes() / 60d;
            return answer(question, context, "Recovery", "Your current wellness recovery score is " + recovery.score() + "/100 · " + recovery.rating() + ". " + (recovery.sleepScore() < recovery.hydrationScore() ? "Sleep is currently the weaker recorded recovery signal, so protecting a consistent sleep window is the highest-leverage place to start." : "Hydration is currently the weaker recorded recovery signal, so spreading fluids consistently across the day is the clearest first step."), List.of("Average recorded sleep this week: " + String.format(Locale.ROOT, "%.1f", averageHours) + " hours.", "Average sleep quality: " + week.sleep().averageQuality() + "/5.", "Sleep contribution: " + recovery.sleepScore() + "/100.", "Hydration contribution: " + recovery.hydrationScore() + "/100."), List.of(new PulseAction("Log sleep", "/log?type=Sleep", null), new PulseAction("Open recovery", "/progress", null), new PulseAction("View sleep", "/sleep", null)));
        }
        if (q.contains("week") || q.contains("analyse") || q.contains("analyze") || q.contains("overall") || q.contains("progress") || q.contains("matter most")) {
            double proteinPercentage = today.proteinTarget() == 0 ? 0 : Math.min(100, week.nutrition().averageProtein() / today.proteinTarget() * 100);
            double hydrationPercentage = Math.min(100, week.hydration().goalPercentage());
            double sleepPercentage = Math.min(100, week.sleep().averageMinutes() / 480d * 100);
            Map<String, Double> signals = new LinkedHashMap<>();
            signals.put("protein consistency", proteinPercentage);
            signals.put("hydration", hydrationPercentage);
            signals.put("sleep", sleepPercentage);
            String strongest = signals.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("consistency");
            String weakest = signals.entrySet().stream().min(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("logging consistency");
            return answer(question, context, "Your week in focus", "Your strongest recorded signal this week is " + strongest + ", while " + weakest + " has the clearest room to improve. Keep the strong behavior stable and choose one small action for the weaker area rather than trying to optimise everything at once.",
                List.of(week.workouts().count() + " workouts · " + week.workouts().totalDurationMinutes() + " training minutes", Math.round(week.nutrition().averageCalories()) + " kcal and " + Math.round(week.nutrition().averageProtein()) + " g protein averaged on logged days", Math.round(week.hydration().averageDailyMl()) + " ml average hydration · " + Math.round(week.hydration().goalPercentage()) + "% of target", String.format(Locale.ROOT, "%.1f hours average sleep · %.1f/5 quality", week.sleep().averageMinutes() / 60d, week.sleep().averageQuality()), week.streak().current() + "-day current logging streak"),
                List.of(new PulseAction("Explore progress", "/progress", null), new PulseAction("View dashboard", "/dashboard", null), new PulseAction("Log health data", "/log", null)));
        }
        int waterRemaining = Math.max(0, today.waterTarget() - today.water());
        return answer(question, context, "Today at a glance", "Based on what you have logged, nutrition and hydration are the most useful live signals for today. You have recorded " + today.calories() + " kcal, " + today.protein() + " g protein and " + today.water() + " ml water; use the remaining targets as guides rather than pass/fail rules.", List.of(today.calories() + " / " + today.calorieTarget() + " kcal", today.protein() + " / " + today.proteinTarget() + " g protein", waterRemaining > 0 ? waterRemaining + " ml hydration remaining" : "Hydration target reached", week.workouts().count() + " workouts and " + week.streak().current() + "-day current streak"), List.of(new PulseAction("Open dashboard", "/dashboard", null), new PulseAction("Log health data", "/log", null), new PulseAction("View progress", "/progress", null)));
    }

    @Transactional(readOnly = true)
    public MealSuggestionResponse mealSuggestions(String email) {
        DashboardSummary today = dashboard.get(email); UserProfile profile = users.findByEmailIgnoreCase(email).orElseThrow().getProfile();
        List<GoalResponse> active = goals.active(email);
        int calorieTarget = goalTarget(active, Goal.Type.CALORIES, today.calorieTarget());
        int proteinTarget = goalTarget(active, Goal.Type.PROTEIN, today.proteinTarget());
        int calories = Math.max(250, calorieTarget - today.calories()); int protein = Math.max(20, proteinTarget - today.protein());
        String pattern = profile == null || profile.getDietaryPattern() == null ? "OMNIVORE" : profile.getDietaryPattern();
        List<MealSuggestion> suggestions = pattern.equals("VEGAN") ? List.of(
            meal("Tofu quinoa power bowl", calories, protein, "Tofu, quinoa, greens and tahini-style lemon dressing"),
            meal("Lentil protein pasta", calories, protein, "Lentil pasta, tomato, spinach and nutritional yeast"),
            meal("Tempeh rice bowl", calories, protein, "Tempeh, rice and seasonal vegetables"))
            : pattern.contains("VEGETARIAN") || pattern.contains("EGGETARIAN") ? List.of(
                meal("Greek yoghurt protein bowl", calories, protein, "Greek yoghurt, fruit, oats and seeds"),
                meal("Paneer grain bowl", calories, protein, "Paneer, rice, greens and cucumber"),
                meal("Egg and lentil wrap", calories, protein, "Eggs, lentils, salad and a wholegrain wrap"))
            : List.of(
                meal("Chicken quinoa bowl", calories, protein, "Chicken, quinoa, greens and yoghurt dressing"),
                meal("Salmon rice plate", calories, protein, "Salmon, rice and seasonal vegetables"),
                meal("Greek yoghurt protein bowl", calories, protein, "Greek yoghurt, fruit, oats and seeds"));
        return new MealSuggestionResponse(calories, protein, Math.max(0, today.carbsTarget() - today.carbs()), Math.max(0, today.fatTarget() - today.fat()), suggestions, "Suggestions use remaining targets and saved dietary pattern. Check labels for allergens and confirm before logging.", false);
    }

    @Transactional(readOnly = true)
    public FinishDayResponse finishDay(String email) {
        DashboardSummary today = dashboard.get(email); MealSuggestionResponse meals = mealSuggestions(email);
        List<GoalResponse> active = goals.active(email);
        int water = Math.max(0, goalTarget(active, Goal.Type.WATER, today.waterTarget()) - today.water());
        List<FinishAction> actions = new ArrayList<>();
        actions.add(new FinishAction("Dinner", meals.suggestions().getFirst().name(), meals.suggestions().getFirst().calories() + " kcal · " + meals.suggestions().getFirst().protein() + " g protein", "/log?type=Meal"));
        if (water > 0) actions.add(new FinishAction("Hydration", water + " ml remaining", "Use quick add in comfortable increments.", null));
        active.stream().filter(goal -> goal.type() == Goal.Type.WORKOUT_FREQUENCY).findFirst().ifPresent(goal -> {
            int remaining = Math.max(0, (int)Math.ceil(goal.targetValue() - value(goal.currentValue())));
            actions.add(new FinishAction("Training", remaining == 0 ? "Weekly workout goal satisfied" : remaining + " workout" + (remaining == 1 ? "" : "s") + " remaining this week",
                remaining == 0 ? "Your recorded sessions already meet this goal." : "Log a completed session when it fits your plan.", remaining == 0 ? "/goals" : "/log?type=Workout"));
        });
        actions.add(new FinishAction("Tonight", "Keep your usual sleep window", "Log sleep when you wake so recovery stays current.", "/log?type=Sleep"));
        return new FinishDayResponse("A concise plan to close today’s remaining gaps.", actions, water, false);
    }

    private int goalTarget(List<GoalResponse> active, Goal.Type type, int fallback) {
        return active.stream().filter(goal -> goal.type() == type).findFirst().map(goal -> (int)Math.round(goal.targetValue())).orElse(fallback);
    }
    private int attentionRank(String status) { return switch (status) { case "BEHIND", "NEEDS_ATTENTION" -> 0; case "NO_DATA" -> 1; case "BUILDING" -> 2; default -> 3; }; }
    private String readable(String value) { return value.toLowerCase(Locale.ROOT).replace('_', ' '); }
    private double value(Double number) { return number == null ? 0 : number; }

    private PulseAnswer answer(String question, Map<String, Object> context, String title, String summary, List<String> evidence, List<PulseAction> actions) {
        AiService.ChatText enhanced = ai.chat(question, context, new AiService.ChatText(title, summary, evidence, false));
        return new PulseAnswer(enhanced.title(), enhanced.answer(), enhanced.evidence(), actions, "Circle Health uses your logged data for general fitness and wellness guidance, not medical diagnosis.", enhanced.generatedByAi());
    }
    private MealSuggestion meal(String name, int remainingCalories, int remainingProtein, String ingredients) { int calories = Math.min(700, Math.max(350, remainingCalories)); int protein = Math.min(55, Math.max(25, remainingProtein)); return new MealSuggestion(name, calories, protein, Math.max(30, (calories - protein * 4) / 6), Math.max(8, (calories - protein * 4) / 18), ingredients); }

    public record PulseAction(String label, String to, Integer waterMl) {}
    public record PulseAnswer(String title, String summary, List<String> evidence, List<PulseAction> actions, String disclaimer, boolean generatedByAi) {}
    public record MealSuggestion(String name, int calories, int protein, int carbohydrates, int fat, String ingredients) {}
    public record MealSuggestionResponse(int remainingCalories, int remainingProtein, int remainingCarbohydrates, int remainingFat, List<MealSuggestion> suggestions, String disclaimer, boolean generatedByAi) {}
    public record FinishAction(String category, String title, String detail, String to) {}
    public record FinishDayResponse(String summary, List<FinishAction> actions, int waterRemainingMl, boolean generatedByAi) {}
}
