package com.pulse.service;

import com.pulse.dto.DashboardSummary;
import com.pulse.dto.GoalDtos.GoalResponse;
import com.pulse.dto.ProgressDtos.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.entity.*;
import com.pulse.repository.AssistantConversationRepository;
import com.pulse.repository.AssistantMessageRepository;
import com.pulse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
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
    private final AssistantConversationRepository conversations;
    private final AssistantMessageRepository messages;
    private final ObjectMapper mapper;

    private static final String DISCLAIMER = "Circle Health uses your logged data for general fitness and wellness guidance, not medical diagnosis.";
    private static final String ROLE_USER = "USER";
    private static final String ROLE_ASSISTANT = "ASSISTANT";
    // History is bounded by size, not by turn count: thirty one-line exchanges cost far less
    // than six long ones, and a single message may run to 4000 characters. The findTop40 limit
    // on the query is only a backstop so a long thread never loads unboundedly.
    private static final int HISTORY_BUDGET_CHARS = 6000;

    // Not readOnly: every exchange is persisted so the assistant can follow up on it later.
    @Transactional
    public PulseAnswer ask(String email, String question, Long conversationId) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        AssistantConversation conversation = resolve(user, conversationId, question);
        List<AiService.Turn> history = recentTurns(conversation.getId());
        store(conversation, ROLE_USER, question, null, false);
        PulseAnswer answer = compose(email, question, history);
        store(conversation, ROLE_ASSISTANT, answer.summary(), payload(answer), answer.generatedByAi());
        conversation.setLastMessageAt(Instant.now());
        conversations.save(conversation);
        return answer.withConversationId(conversation.getId());
    }

    private PulseAnswer compose(String email, String question, List<AiService.Turn> history) {
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
        if (has(q, "chest pain", "faint", "dizz", "injur", "diagnos", "medication", "medical", "emergency",
                "胸痛", "头晕", "晕", "受伤", "扭伤", "诊断", "吃药", "生病", "急诊", "不舒服", "疼")) {
            // Deliberately not routed through the model: safety wording must not be paraphrased.
            return fixed("Health and safety", "I can help interpret your logged wellness patterns, but I cannot assess symptoms, injuries, medication or diagnose a condition. If symptoms are severe, sudden or worrying, seek urgent medical care; otherwise speak with a qualified clinician who can assess your individual situation.",
                List.of("Your Circle Health records can be useful context to share with a clinician.", "Do not use a fitness trend or adherence score to rule out a medical concern."),
                List.of(new PulseAction("View your data", "/progress", null)));
        }
        if (has(q, "which goal", "goal needs", "most attention", "哪个目标", "最需要")) {
            List<GoalResponse> ranked = active.stream().sorted(Comparator
                .comparingInt((GoalResponse goal) -> attentionRank(goal.trackStatus()))
                .thenComparingDouble(GoalResponse::progress)).toList();
            if (!ranked.isEmpty()) {
                GoalResponse priority = ranked.getFirst();
                List<String> evidence = ranked.stream().limit(3)
                    .map(goal -> goal.title() + ": " + Math.round(goal.progress()) + "% · " + readable(goal.trackStatus()))
                    .toList();
                return answer(question, history, context, "Goal priority", priority.title() + " currently needs the most attention. Focus on the smallest repeatable action that moves this metric, then reassess after another week of consistent logging.", evidence,
                    List.of(new PulseAction("Open goals", "/goals", null)));
            }
        }
        if (has(q, "goal", "目标") && !active.isEmpty()) {
            GoalResponse priority = active.stream().min(Comparator
                .comparingInt((GoalResponse goal) -> attentionRank(goal.trackStatus()))
                .thenComparingDouble(GoalResponse::progress)).orElse(active.getFirst());
            List<String> evidence = active.stream().limit(4).map(goal -> goal.title() + ": " + Math.round(goal.progress()) + "% · " + readable(goal.trackStatus())).toList();
            return answer(question, history, context, "Your goals", "You have " + active.size() + " active goal" + (active.size() == 1 ? "" : "s") + ". " + priority.title() + " has the most room to move, so making its next action easy and specific is likely to create the best momentum.", evidence,
                List.of(new PulseAction("Review goals", "/goals", null), new PulseAction("Log health data", "/log", null)));
        }
        if (has(q, "protein", "蛋白")) {
            Optional<GoalResponse> goal = active.stream().filter(item -> item.type() == Goal.Type.PROTEIN).findFirst();
            int target = goal.map(value -> (int)Math.round(value.targetValue())).orElse(today.proteinTarget());
            int remaining = Math.max(0, target - today.protein());
            List<String> evidence = new ArrayList<>();
            evidence.add("You have logged " + today.protein() + " g against a " + target + " g target.");
            goal.ifPresent(value -> evidence.add("Seven-day goal adherence is " + Math.round(value.progress()) + "% · " + readable(value.trackStatus()) + "."));
            evidence.add("Today’s calories are " + today.calories() + " of " + today.calorieTarget() + " kcal.");
            return answer(question, history, context, "Protein today", remaining == 0 ? "You have reached today’s protein target. Keep the rest of today balanced rather than adding protein only for the sake of exceeding it." : "You have " + remaining + " g of protein remaining today. Split that across your remaining meals or snacks so it is easier to reach without pushing calories far beyond target.", evidence, List.of(new PulseAction("Log a meal", "/log?type=Meal", null), new PulseAction("Open nutrition", "/nutrition", null)));
        }
        if (has(q, "calorie", "macro", "nutrition", "food", "eat", "meal",
                "热量", "卡路里", "饮食", "营养", "吃", "餐")) {
            int calorieRemaining = Math.max(0, today.calorieTarget() - today.calories());
            int proteinRemaining = Math.max(0, today.proteinTarget() - today.protein());
            return answer(question, history, context, "Nutrition today", calorieRemaining == 0 ? "You are at or above today’s calorie target. Prioritise hunger, meal quality and your overall weekly pattern rather than trying to correct a single day aggressively." : "You have about " + calorieRemaining + " kcal and " + proteinRemaining + " g protein remaining today. A meal built around a protein source, vegetables or fruit, and a portion of carbohydrate would address the remaining targets more evenly.",
                List.of(today.calories() + " / " + today.calorieTarget() + " kcal logged", today.protein() + " / " + today.proteinTarget() + " g protein", today.carbs() + " / " + today.carbsTarget() + " g carbohydrates", today.fat() + " / " + today.fatTarget() + " g fat"),
                List.of(new PulseAction("Log a meal", "/log?type=Meal", null), new PulseAction("Review nutrition", "/nutrition", null)));
        }
        if (has(q, "water", "hydrat", "喝水", "水分", "补水", "饮水")) {
            int remaining = Math.max(0, today.waterTarget() - today.water());
            int percentage = today.waterTarget() == 0 ? 0 : (int)Math.round(today.water() * 100d / today.waterTarget());
            return answer(question, history, context, "Hydration today", remaining == 0 ? "You have reached today’s hydration target. Continue drinking according to thirst and the demands of your activity and environment." : "You are at " + percentage + "% of today’s hydration target, with " + remaining + " ml remaining. Use comfortable increments across the rest of the day rather than trying to drink it all at once.",
                List.of(today.water() + " ml logged today", today.waterTarget() + " ml daily target", Math.round(week.hydration().averageDailyMl()) + " ml average on recorded days this week"),
                List.of(new PulseAction("Add 250 ml", null, 250), new PulseAction("Open hydration", "/water", null)));
        }
        if (has(q, "weight", "68", "体重", "减重", "增重")) {
            Optional<GoalResponse> goal = active.stream().filter(item -> item.type() == Goal.Type.WEIGHT).findFirst();
            if (goal.isPresent()) { GoalResponse value = goal.get(); String projection = value.projectedDate() == null ? "Record more measurements to unlock a reliable trend projection." : "At the recent recorded pace, the estimated projection is " + value.projectedDate() + "."; String current = value.currentValue() == null ? "No current measurement is available" : value.currentValue() + " " + value.unit() + " recorded"; return answer(question, history, context, "Weight goal", "Your weight goal is " + Math.round(value.progress()) + "% complete and currently " + readable(value.trackStatus()) + ". Treat the multi-week trend as more meaningful than any single weigh-in because normal day-to-day variation can be substantial.", List.of(current + " toward " + value.targetValue() + " " + value.unit() + ".", projection, week.body().weightChange() == null ? "There is not enough in-range data to calculate this week’s change." : "Recorded change across this week: " + week.body().weightChange() + " kg."), List.of(new PulseAction("Open goal", "/goals", null), new PulseAction("Log weight", "/log?type=Body", null), new PulseAction("View body trend", "/body", null))); }
            return answer(question, history, context, "Weight trend", today.weight() > 0 ? "Your latest recorded weight is " + today.weight() + " kg. Add measurements under similar conditions and evaluate the trend across several weeks for a more useful signal." : "There is no recent weight measurement to analyse yet. Log a measurement to establish a baseline.", List.of("Single weigh-ins can move with hydration, meals and timing.", "Circle Health uses recorded measurements rather than estimated weight."), List.of(new PulseAction("Log weight", "/log?type=Body", null), new PulseAction("Open body", "/body", null)));
        }
        if (has(q, "workout", "training", "训练", "锻炼", "运动", "健身")) {
            Optional<GoalResponse> goal = active.stream().filter(item -> item.type() == Goal.Type.WORKOUT_FREQUENCY).findFirst();
            int count = week.workouts().count();
            int duration = week.workouts().totalDurationMinutes();
            if (goal.isPresent()) { GoalResponse value = goal.get(); int remaining = Math.max(0, (int)Math.ceil(value.targetValue() - value.currentValue())); return answer(question, history, context, "Training this week", remaining == 0 ? "Your weekly workout goal is already satisfied. Let recovery and session quality guide any additional training rather than adding volume solely to increase the count." : "You have " + remaining + " workout" + (remaining == 1 ? "" : "s") + " remaining this week. Place them where you can train with good effort while leaving enough recovery between demanding sessions.", List.of(Math.round(value.currentValue()) + " of " + Math.round(value.targetValue()) + " planned sessions are complete.", duration + " total training minutes logged this week.", Math.round(week.workouts().trainingVolumeKg()) + " kg recorded training volume."), List.of(new PulseAction("Log workout", "/log?type=Workout", null), new PulseAction("Open workouts", "/workouts", null), new PulseAction("View goal", "/goals", null))); }
            return answer(question, history, context, "Training this week", "You have completed " + count + " workout" + (count == 1 ? "" : "s") + " this week. Use consistency, recovery and progression in your main exercises as the primary signals—not session count alone.", List.of(duration + " total training minutes", Math.round(week.workouts().trainingVolumeKg()) + " kg recorded volume", recovery.trainingLoadScore() + "/100 training-load contribution to recovery"), List.of(new PulseAction("Open workouts", "/workouts", null), new PulseAction("Log workout", "/log?type=Workout", null)));
        }
        if (has(q, "yesterday", "off track", "tuesday", "昨天", "昨日")) {
            LocalDate date = has(q, "yesterday", "昨天", "昨日") ? LocalDate.now().minusDays(1) : LocalDate.now();
            CalendarDay day = calendar.get(email, date.getYear(), date.getMonthValue()).days().stream().filter(item -> item.date().equals(date)).findFirst().orElse(null);
            if (day != null) return answer(question, history, context, "Daily adherence", date + " was " + readable(day.status().name()) + " with a score of " + day.score() + "/100. " + (day.attentionAreas().isEmpty() ? "The logged categories were generally aligned with your targets." : "The clearest opportunities are the categories listed below; focus on the most controllable one first."), day.attentionAreas().isEmpty() ? day.wins() : day.attentionAreas(), List.of(new PulseAction("Open calendar", "/progress", null), new PulseAction("Log health data", "/log", null)));
        }
        if (has(q, "sleep", "recovery", "睡眠", "休息", "恢复")) {
            double averageHours = week.sleep().averageMinutes() / 60d;
            return answer(question, history, context, "Recovery", "Your current wellness recovery score is " + recovery.score() + "/100 · " + recovery.rating() + ". " + (recovery.sleepScore() < recovery.hydrationScore() ? "Sleep is currently the weaker recorded recovery signal, so protecting a consistent sleep window is the highest-leverage place to start." : "Hydration is currently the weaker recorded recovery signal, so spreading fluids consistently across the day is the clearest first step."), List.of("Average recorded sleep this week: " + String.format(Locale.ROOT, "%.1f", averageHours) + " hours.", "Average sleep quality: " + week.sleep().averageQuality() + "/5.", "Sleep contribution: " + recovery.sleepScore() + "/100.", "Hydration contribution: " + recovery.hydrationScore() + "/100."), List.of(new PulseAction("Log sleep", "/log?type=Sleep", null), new PulseAction("Open recovery", "/progress", null), new PulseAction("View sleep", "/sleep", null)));
        }
        if (has(q, "week", "analyse", "analyze", "overall", "progress", "matter most",
                "本周", "这周", "一周", "进度", "总体", "整体", "分析", "怎么样")) {
            double proteinPercentage = today.proteinTarget() == 0 ? 0 : Math.min(100, week.nutrition().averageProtein() / today.proteinTarget() * 100);
            double hydrationPercentage = Math.min(100, week.hydration().goalPercentage());
            double sleepPercentage = Math.min(100, week.sleep().averageMinutes() / 480d * 100);
            Map<String, Double> signals = new LinkedHashMap<>();
            signals.put("protein consistency", proteinPercentage);
            signals.put("hydration", hydrationPercentage);
            signals.put("sleep", sleepPercentage);
            String strongest = signals.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("consistency");
            String weakest = signals.entrySet().stream().min(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("logging consistency");
            return answer(question, history, context, "Your week in focus", "Your strongest recorded signal this week is " + strongest + ", while " + weakest + " has the clearest room to improve. Keep the strong behavior stable and choose one small action for the weaker area rather than trying to optimise everything at once.",
                List.of(week.workouts().count() + " workouts · " + week.workouts().totalDurationMinutes() + " training minutes", Math.round(week.nutrition().averageCalories()) + " kcal and " + Math.round(week.nutrition().averageProtein()) + " g protein averaged on logged days", Math.round(week.hydration().averageDailyMl()) + " ml average hydration · " + Math.round(week.hydration().goalPercentage()) + "% of target", String.format(Locale.ROOT, "%.1f hours average sleep · %.1f/5 quality", week.sleep().averageMinutes() / 60d, week.sleep().averageQuality()), week.streak().current() + "-day current logging streak"),
                List.of(new PulseAction("Explore progress", "/progress", null), new PulseAction("View dashboard", "/dashboard", null), new PulseAction("Log health data", "/log", null)));
        }
        int waterRemaining = Math.max(0, today.waterTarget() - today.water());
        return answer(question, history, context, "Today at a glance", "Based on what you have logged, nutrition and hydration are the most useful live signals for today. You have recorded " + today.calories() + " kcal, " + today.protein() + " g protein and " + today.water() + " ml water; use the remaining targets as guides rather than pass/fail rules.", List.of(today.calories() + " / " + today.calorieTarget() + " kcal", today.protein() + " / " + today.proteinTarget() + " g protein", waterRemaining > 0 ? waterRemaining + " ml hydration remaining" : "Hydration target reached", week.workouts().count() + " workouts and " + week.streak().current() + "-day current streak"), List.of(new PulseAction("Open dashboard", "/dashboard", null), new PulseAction("Log health data", "/log", null), new PulseAction("View progress", "/progress", null)));
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

    @Transactional(readOnly = true)
    public List<ConversationSummary> listConversations(String email) {
        Long userId = users.findByEmailIgnoreCase(email).orElseThrow().getId();
        return conversations.findTop30ByUserIdOrderByLastMessageAtDesc(userId).stream()
            .map(conversation -> new ConversationSummary(conversation.getId(), conversation.getTitle(), conversation.getLastMessageAt()))
            .toList();
    }

    @Transactional(readOnly = true)
    public ConversationDetail conversation(String email, Long id) {
        AssistantConversation conversation = owned(email, id);
        List<ConversationMessage> history = messages.findByConversationIdOrderByCreatedAtAsc(conversation.getId()).stream()
            .map(message -> new ConversationMessage(message.getId(), message.getRole(), message.getContent(), restore(message), message.getCreatedAt()))
            .toList();
        return new ConversationDetail(conversation.getId(), conversation.getTitle(), history);
    }

    @Transactional
    public void deleteConversation(String email, Long id) {
        AssistantConversation conversation = owned(email, id);
        messages.deleteByConversationId(conversation.getId());
        conversations.delete(conversation);
    }

    @Transactional
    public void deleteAllConversations(String email) {
        Long userId = users.findByEmailIgnoreCase(email).orElseThrow().getId();
        conversations.findByUserId(userId)
            .forEach(conversation -> messages.deleteByConversationId(conversation.getId()));
        conversations.deleteByUserId(userId);
    }

    // Scoped by the authenticated user, never by the client-supplied id alone: without this
    // any signed-in account could read or delete another user's health conversation by id.
    private AssistantConversation owned(String email, Long id) {
        Long userId = users.findByEmailIgnoreCase(email).orElseThrow().getId();
        return conversations.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
    }

    private AssistantConversation resolve(User user, Long conversationId, String question) {
        if (conversationId != null) {
            return conversations.findByIdAndUserId(conversationId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        }
        AssistantConversation conversation = new AssistantConversation();
        conversation.setUser(user);
        conversation.setTitle(title(question));
        conversation.setLastMessageAt(Instant.now());
        return conversations.save(conversation);
    }

    private String title(String question) {
        String clean = question == null ? "" : question.trim();
        if (clean.isBlank()) return "New conversation";
        return clean.length() <= 60 ? clean : clean.substring(0, 57) + "…";
    }

    private List<AiService.Turn> recentTurns(Long conversationId) {
        List<AssistantMessage> newestFirst = messages.findTop40ByConversationIdOrderByCreatedAtDesc(conversationId);
        List<AiService.Turn> turns = new ArrayList<>();
        int used = 0;
        for (AssistantMessage message : newestFirst) {
            String content = message.getContent() == null ? "" : message.getContent();
            if (!turns.isEmpty() && used + content.length() > HISTORY_BUDGET_CHARS) break;
            turns.add(new AiService.Turn(message.getRole(), content));
            used += content.length();
        }
        Collections.reverse(turns);
        return turns;
    }

    private void store(AssistantConversation conversation, String role, String content, String payload, boolean generatedByAi) {
        AssistantMessage message = new AssistantMessage();
        message.setConversation(conversation);
        message.setRole(role);
        message.setContent(trim(content));
        message.setPayload(payload);
        message.setGeneratedByAi(generatedByAi);
        messages.save(message);
    }

    private String trim(String content) {
        String clean = content == null ? "" : content;
        return clean.length() <= 4000 ? clean : clean.substring(0, 4000);
    }

    // The full answer is kept as JSON so a reloaded conversation redraws evidence and actions,
    // not just the summary sentence. A failure here must not cost the user their reply.
    private String payload(PulseAnswer answer) {
        try { return mapper.writeValueAsString(answer); } catch (Exception ignored) { return null; }
    }

    private PulseAnswer restore(AssistantMessage message) {
        if (message.getPayload() == null || !ROLE_ASSISTANT.equals(message.getRole())) return null;
        try { return mapper.readValue(message.getPayload(), PulseAnswer.class); } catch (Exception ignored) { return null; }
    }

    private int goalTarget(List<GoalResponse> active, Goal.Type type, int fallback) {
        return active.stream().filter(goal -> goal.type() == type).findFirst().map(goal -> (int)Math.round(goal.targetValue())).orElse(fallback);
    }
    // Branch matching runs on the raw question, so every keyword needs its Chinese
    // counterpart - the UI is English but the users are not.
    private boolean has(String q, String... keys) {
        for (String key : keys) if (q.contains(key)) return true;
        return false;
    }
    private int attentionRank(String status) { return switch (status) { case "BEHIND", "NEEDS_ATTENTION" -> 0; case "NO_DATA" -> 1; case "BUILDING" -> 2; default -> 3; }; }
    private String readable(String value) { return value.toLowerCase(Locale.ROOT).replace('_', ' '); }
    private double value(Double number) { return number == null ? 0 : number; }

    private PulseAnswer fixed(String title, String summary, List<String> evidence, List<PulseAction> actions) {
        return new PulseAnswer(title, summary, evidence, actions, DISCLAIMER, false, null);
    }

    private PulseAnswer answer(String question, List<AiService.Turn> history, Map<String, Object> context, String title, String summary, List<String> evidence, List<PulseAction> actions) {
        AiService.ChatText enhanced = ai.chat(question, history, context, new AiService.ChatText(title, summary, evidence, false));
        return new PulseAnswer(enhanced.title(), enhanced.answer(), enhanced.evidence(), actions, DISCLAIMER, enhanced.generatedByAi(), null);
    }
    private MealSuggestion meal(String name, int remainingCalories, int remainingProtein, String ingredients) { int calories = Math.min(700, Math.max(350, remainingCalories)); int protein = Math.min(55, Math.max(25, remainingProtein)); return new MealSuggestion(name, calories, protein, Math.max(30, (calories - protein * 4) / 6), Math.max(8, (calories - protein * 4) / 18), ingredients); }

    public record PulseAction(String label, String to, Integer waterMl) {}
    public record PulseAnswer(String title, String summary, List<String> evidence, List<PulseAction> actions, String disclaimer, boolean generatedByAi, Long conversationId) {
        PulseAnswer withConversationId(Long id) { return new PulseAnswer(title, summary, evidence, actions, disclaimer, generatedByAi, id); }
    }
    public record ConversationSummary(Long id, String title, Instant lastMessageAt) {}
    public record ConversationMessage(Long id, String role, String content, PulseAnswer answer, Instant createdAt) {}
    public record ConversationDetail(Long id, String title, List<ConversationMessage> messages) {}
    public record MealSuggestion(String name, int calories, int protein, int carbohydrates, int fat, String ingredients) {}
    public record MealSuggestionResponse(int remainingCalories, int remainingProtein, int remainingCarbohydrates, int remainingFat, List<MealSuggestion> suggestions, String disclaimer, boolean generatedByAi) {}
    public record FinishAction(String category, String title, String detail, String to) {}
    public record FinishDayResponse(String summary, List<FinishAction> actions, int waterRemainingMl, boolean generatedByAi) {}
}
