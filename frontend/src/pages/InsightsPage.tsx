import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowRight,
  ArrowUp,
  Brain,
  CheckCircle2,
  Dumbbell,
  ExternalLink,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Utensils,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrandMark } from "../components/BrandLogo";
import { Card, FormField, inputClass, PageHeader, PillButton } from "../components/ui";
import { api } from "../services/api";
import type { FinishDayResponse, MealPlanRecord, MealSuggestionResponse, PulseAnswer, WorkoutPlanRecord } from "../types";

type ChatMessage =
  | { id: string; role: "user"; kind: "text"; text: string }
  | { id: string; role: "assistant"; kind: "answer"; answer: PulseAnswer }
  | { id: string; role: "assistant"; kind: "meals"; meals: MealSuggestionResponse }
  | { id: string; role: "assistant"; kind: "finish"; finish: FinishDayResponse }
  | { id: string; role: "assistant"; kind: "error"; text: string };

const prompts = [
  "Analyse my week and tell me what matters most",
  "How can I hit my protein target today?",
  "Am I doing enough to reach my goals?",
  "How is my recovery looking?",
];

export default function InsightsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [asking, setAsking] = useState(false);
  const sequence = useRef(0);
  const initialQueryHandled = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const id = useCallback(() => String(++sequence.current), []);

  const addError = useCallback((reason: unknown) => {
    setMessages((current) => [
      ...current,
      {
        id: id(),
        role: "assistant",
        kind: "error",
        text: reason instanceof Error ? reason.message : "I couldn’t prepare that answer. Please try again.",
      },
    ]);
  }, [id]);

  const ask = useCallback(async (value = question) => {
    const clean = value.trim();
    if (!clean || asking) return;
    setMessages((current) => [...current, { id: id(), role: "user", kind: "text", text: clean }]);
    setQuestion("");
    setAsking(true);
    try {
      const answer = await api.askPulse(clean);
      setMessages((current) => [...current, { id: id(), role: "assistant", kind: "answer", answer }]);
    } catch (reason) {
      addError(reason);
    } finally {
      setAsking(false);
    }
  }, [addError, asking, id, question]);

  const runAssistant = async (mode: "meal" | "finish") => {
    if (asking) return;
    const label = mode === "meal" ? "What should I eat to finish today well?" : "Help me finish today";
    setMessages((current) => [...current, { id: id(), role: "user", kind: "text", text: label }]);
    setAsking(true);
    try {
      if (mode === "meal") {
        const meals = await api.getMealSuggestions();
        setMessages((current) => [...current, { id: id(), role: "assistant", kind: "meals", meals }]);
      } else {
        const finish = await api.finishDay();
        setMessages((current) => [...current, { id: id(), role: "assistant", kind: "finish", finish }]);
      }
    } catch (reason) {
      addError(reason);
    } finally {
      setAsking(false);
    }
  };

  const handleAction = async (action: PulseAnswer["actions"][number]) => {
    if (action.waterMl) {
      try {
        await api.addWater(action.waterMl);
        setMessages((current) => [
          ...current,
          { id: id(), role: "assistant", kind: "answer", answer: { title: "Water logged", summary: `${action.waterMl} ml has been added to today’s hydration.`, evidence: [], actions: [{ label: "View hydration", to: "/log?tab=water" }], disclaimer: "", generatedByAi: false } },
        ]);
      } catch (reason) {
        addError(reason);
      }
    }
    if (action.to) navigate(action.to);
  };

  useEffect(() => {
    const query = searchParams.get("q");
    if (query && !initialQueryHandled.current) {
      initialQueryHandled.current = true;
      void ask(query);
    }
  }, [ask, searchParams]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, asking]);

  const submitFromKeyboard = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void ask();
    }
  };

  const aiTab = searchParams.get("tab") === "meal-plan" || searchParams.get("tab") === "workout-plan" ? searchParams.get("tab")! : "ask";
  const changeTab = (next: string) => { const params = new URLSearchParams(searchParams); if (next === "ask") params.delete("tab"); else params.set("tab", next); setSearchParams(params); };
  if (aiTab !== "ask") return <CirclePlanGenerator mode={aiTab as "meal-plan" | "workout-plan"} onTabChange={changeTab}/>;

  return (
    <>
    <CircleAiTabs value="ask" onChange={changeTab}/>
    <div className="mx-auto flex min-h-[calc(100vh-112px)] max-w-[960px] flex-col">
      <header className="flex items-center gap-3 border-b border-line pb-4">
        <span className="grid size-11 place-items-center rounded-2xl border border-line bg-surface shadow-sm">
          <BrandMark className="size-8" />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-[-.035em]">Ask Circle</h1>
            <span className="rounded-full bg-[#e9ffef] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-success">Your data connected</span>
          </div>
          <p className="mt-0.5 text-xs text-muted">Personal guidance grounded in your Circle Health records.</p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={() => setMessages([])} className="ml-auto inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold text-muted transition hover:bg-surface-muted hover:text-ink">
            <RotateCcw size={14} /> New chat
          </button>
        )}
      </header>

      <main className="flex-1 py-6">
        {messages.length === 0 ? (
          <section className="mx-auto flex min-h-[54vh] max-w-2xl flex-col items-center justify-center text-center">
            <span className="grid size-14 place-items-center rounded-[20px] bg-ink text-white shadow-lg shadow-black/10">
              <Sparkles size={22} />
            </span>
            <h2 className="mt-5 text-[30px] font-bold tracking-[-.05em] md:text-[36px]">What would you like to understand?</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Ask about your nutrition, training, recovery, goals or recent progress. Circle uses your logged data to explain what is happening and what you can do next.</p>
            <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
              {prompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => void ask(prompt)} className="group flex min-h-[58px] items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:border-coral/25 hover:shadow-md">
                  <span>{prompt}</span>
                  <ArrowRight size={15} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-coral" />
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => void runAssistant("meal")} className="rounded-full bg-[#fff1ef] px-4 py-2 text-xs font-bold text-coral"><Utensils size={14} className="mr-1.5 inline" />What should I eat?</button>
              <button type="button" onClick={() => void runAssistant("finish")} className="rounded-full bg-[#eeeaff] px-4 py-2 text-xs font-bold text-violet"><CheckCircle2 size={14} className="mr-1.5 inline" />Finish my day</button>
            </div>
          </section>
        ) : (
          <div className="space-y-7">
            {messages.map((message) => (
              <ChatMessageView key={message.id} message={message} onAction={handleAction} />
            ))}
            {asking && (
              <div className="flex items-start gap-3">
                <AssistantAvatar />
                <div className="flex h-10 items-center gap-2 text-sm text-muted"><LoaderCircle size={16} className="animate-spin text-violet" /> Analysing your records…</div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 z-10 bg-gradient-to-t from-canvas via-canvas to-canvas/0 pb-2 pt-6">
        <div className="rounded-[24px] border border-line bg-surface p-2 shadow-[0_14px_45px_rgba(23,23,23,.10)]">
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={question}
              disabled={asking}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={submitFromKeyboard}
              placeholder="Ask a detailed question about your health data…"
              className="max-h-32 min-h-12 min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 outline-none placeholder:text-muted"
            />
            <button type="button" disabled={asking || !question.trim()} onClick={() => void ask()} aria-label="Send question" className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35">
              {asking ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowUp size={18} />}
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted">Circle can make mistakes. Guidance is general wellness information, not medical diagnosis.</p>
      </footer>
    </div>
    </>
  );
}

function CircleAiTabs({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="mb-5 flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface-muted p-1" role="tablist" aria-label="Circle AI modes">{[["ask", "Ask Circle"], ["meal-plan", "Meal Plan"], ["workout-plan", "Workout Plan"]].map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${value === key ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>{label}</button>)}</div>;
}

function CirclePlanGenerator({ mode, onTabChange }: { mode: "meal-plan" | "workout-plan"; onTabChange: (value: string) => void }) {
  const isMeal = mode === "meal-plan";
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [meal, setMeal] = useState<MealPlanRecord | null>(null);
  const [workout, setWorkout] = useState<WorkoutPlanRecord | null>(null);
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutPlanRecord[]>([]);
  const [mealForm, setMealForm] = useState({ calorieTarget: 2200, proteinTarget: 150, carbohydrateTarget: 250, fatTarget: 70, dietaryPreference: "Balanced", allergies: "", dislikedFoods: "", mealsPerDay: 4 });
  const [workoutForm, setWorkoutForm] = useState({ fitnessGoal: "General fitness", experienceLevel: "Intermediate", daysPerWeek: 4, workoutDuration: 60, availableEquipment: ["Dumbbells", "Machine"], preferences: "Balanced full-body training" });
  useEffect(() => { api.getProfile().then((profile) => { setMealForm((current) => ({ ...current, calorieTarget: profile.calorieTarget ?? current.calorieTarget, proteinTarget: profile.proteinTarget ?? current.proteinTarget, carbohydrateTarget: profile.carbTarget ?? current.carbohydrateTarget, fatTarget: profile.fatTarget ?? current.fatTarget, dietaryPreference: profile.dietarySummary || profile.dietaryPreferences || current.dietaryPreference, allergies: profile.dietaryProfile?.allergies.join(", ") ?? "", dislikedFoods: profile.dietaryProfile?.dislikedFoods.join(", ") || profile.dislikedIngredients || "", mealsPerDay: profile.dietaryProfile?.preferredMealsPerDay ?? current.mealsPerDay })); setWorkoutForm((current) => ({ ...current, fitnessGoal: profile.fitnessGoal || current.fitnessGoal })); }).catch(() => undefined).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!isMeal) void api.getWorkoutPlans().then((items) => { setSavedWorkouts(items); setWorkout((current) => current ?? items[0] ?? null); }).catch(() => undefined); }, [isMeal]);
  const generate = async () => { setGenerating(true); setError(""); try { if (isMeal) setMeal(await api.generateMealPlan(mealForm)); else { const generated = await api.generateWorkoutPlan(workoutForm); setWorkout(generated); setSavedWorkouts((current) => [generated, ...current]); } } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to generate this plan"); } finally { setGenerating(false); } };
  const result = isMeal ? meal : workout;
  return <div><CircleAiTabs value={mode} onChange={onTabChange}/><PageHeader eyebrow="Circle AI" title={isMeal ? "AI Meal Plan" : "AI Workout Plan"} description={isMeal ? "Generate a seven-day plan from your persisted targets and dietary profile." : "Generate a structured training week from your goal, experience and equipment."}/>{error && <p role="alert" className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">{error}</p>}<div className="grid gap-4 xl:grid-cols-[360px_1fr]"><Card className="p-5"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-[#eeeaff] text-violet">{isMeal ? <Utensils size={17}/> : <Dumbbell size={17}/>}</span><div><h2 className="font-bold">Plan inputs</h2><p className="text-xs text-muted">Seeded from your saved profile</p></div></div>{loading ? <div className="mt-5 h-52 animate-pulse rounded-2xl bg-surface-muted"/> : isMeal ? <div className="mt-5 grid gap-4"><div className="grid grid-cols-2 gap-3"><NumberField label="Calories" value={mealForm.calorieTarget} onChange={(value) => setMealForm({ ...mealForm, calorieTarget: value })}/><NumberField label="Protein (g)" value={mealForm.proteinTarget} onChange={(value) => setMealForm({ ...mealForm, proteinTarget: value })}/><NumberField label="Carbs (g)" value={mealForm.carbohydrateTarget} onChange={(value) => setMealForm({ ...mealForm, carbohydrateTarget: value })}/><NumberField label="Fat (g)" value={mealForm.fatTarget} onChange={(value) => setMealForm({ ...mealForm, fatTarget: value })}/></div><FormField label="Dietary preference"><input className={inputClass} value={mealForm.dietaryPreference} onChange={(event) => setMealForm({ ...mealForm, dietaryPreference: event.target.value })}/></FormField><NumberField label="Meals per day" value={mealForm.mealsPerDay} onChange={(value) => setMealForm({ ...mealForm, mealsPerDay: value })}/></div> : <div className="mt-5 grid gap-4"><FormField label="Fitness goal"><input className={inputClass} value={workoutForm.fitnessGoal} onChange={(event) => setWorkoutForm({ ...workoutForm, fitnessGoal: event.target.value })}/></FormField><FormField label="Experience"><select className={inputClass} value={workoutForm.experienceLevel} onChange={(event) => setWorkoutForm({ ...workoutForm, experienceLevel: event.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></FormField><div className="grid grid-cols-2 gap-3"><NumberField label="Days / week" value={workoutForm.daysPerWeek} onChange={(value) => setWorkoutForm({ ...workoutForm, daysPerWeek: value })}/><NumberField label="Minutes" value={workoutForm.workoutDuration} onChange={(value) => setWorkoutForm({ ...workoutForm, workoutDuration: value })}/></div><FormField label="Preferences"><textarea className={`${inputClass} h-24 py-3`} value={workoutForm.preferences} onChange={(event) => setWorkoutForm({ ...workoutForm, preferences: event.target.value })}/></FormField></div>}{!isMeal && savedWorkouts.length > 0 && <FormField label="Saved workout plans"><select className={inputClass} value={workout?.id ?? ""} onChange={(event) => setWorkout(savedWorkouts.find((item) => item.id === Number(event.target.value)) ?? null)}>{savedWorkouts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>}<PillButton disabled={loading || generating} onClick={() => void generate()} className="mt-5 w-full bg-ink text-white"><Sparkles size={16}/>{generating ? "Generating…" : "Generate and save plan"}</PillButton></Card><Card className="min-h-[420px] p-5 md:p-6">{!result ? <div className="grid h-full min-h-[360px] place-items-center text-center"><div><Brain className="mx-auto text-violet"/><h2 className="mt-3 font-bold">Your plan will appear here</h2><p className="mt-1 text-sm text-muted">Generation is persisted by the backend and labelled by source.</p></div></div> : isMeal && meal ? <div><PlanSource generated={meal.plan.generatedByAi}/><h2 className="mt-2 text-2xl font-bold">{meal.plan.name}</h2><p className="mt-2 text-sm leading-6 text-muted">{meal.plan.summary}</p><div className="mt-5 space-y-3">{meal.plan.days.map((day) => <div key={day.day} className="rounded-2xl bg-surface-muted p-4"><h3 className="font-bold">{day.day}</h3><p className="mt-2 text-xs leading-5 text-muted">{day.meals.map((item) => `${item.name} (${item.calories} kcal)`).join(" · ")}</p></div>)}</div><Link to="/meal-planner" className="mt-5 inline-flex text-sm font-bold text-coral">Open saved plan in Meal Planner <ArrowRight size={15} className="ml-1"/></Link></div> : workout ? <div><PlanSource generated={workout.plan.generatedByAi}/><h2 className="mt-2 text-2xl font-bold">{workout.plan.name}</h2><p className="mt-2 text-sm leading-6 text-muted">{workout.plan.summary}</p><div className="mt-5 grid gap-3 md:grid-cols-2">{workout.plan.days.map((day) => <div key={day.name} className="rounded-2xl bg-surface-muted p-4"><h3 className="font-bold">{day.name}</h3><p className="text-xs text-muted">{day.focus}</p><ul className="mt-3 space-y-2 text-xs">{day.exercises.map((exercise) => <li key={exercise.name}>{exercise.name} · {exercise.sets} × {exercise.reps}</li>)}</ul></div>)}</div></div> : null}</Card></div></div>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <FormField label={label}><input type="number" min="1" className={inputClass} value={value} onChange={(event) => onChange(Number(event.target.value))}/></FormField>; }
function PlanSource({ generated }: { generated: boolean }) { return <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${generated ? "bg-[#eeeaff] text-violet" : "bg-surface-muted text-muted"}`}>{generated ? "AI generated" : "Deterministic fallback"}</span>; }

function AssistantAvatar() {
  return <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface"><BrandMark className="size-6" /></span>;
}

function ChatMessageView({ message, onAction }: { message: ChatMessage; onAction: (action: PulseAnswer["actions"][number]) => Promise<void> }) {
  if (message.role === "user") {
    return <div className="flex justify-end"><p className="max-w-[82%] rounded-[20px] rounded-br-md bg-ink px-4 py-3 text-sm leading-6 text-white md:max-w-[70%]">{message.text}</p></div>;
  }
  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 pt-1">
        {message.kind === "error" && <p className="rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">{message.text}</p>}
        {message.kind === "answer" && <AnswerMessage answer={message.answer} onAction={onAction} />}
        {message.kind === "meals" && <MealMessage response={message.meals} />}
        {message.kind === "finish" && <FinishMessage response={message.finish} />}
      </div>
    </div>
  );
}

function AnswerMessage({ answer, onAction }: { answer: PulseAnswer; onAction: (action: PulseAnswer["actions"][number]) => Promise<void> }) {
  return <div>
    <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold">{answer.title}</h2>{answer.generatedByAi && <span className="rounded-full bg-[#eeeaff] px-2 py-0.5 text-[9px] font-bold uppercase text-violet">AI enhanced</span>}</div>
    <p className="mt-2 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-ink">{answer.summary}</p>
    {answer.evidence.length > 0 && <div className="mt-4 max-w-3xl space-y-2 border-l-2 border-violet/25 pl-4">{answer.evidence.map((item) => <p key={item} className="text-sm leading-6 text-muted">{item}</p>)}</div>}
    {answer.actions.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{answer.actions.map((action) => <button key={`${action.label}-${action.to ?? action.waterMl ?? ""}`} type="button" onClick={() => void onAction(action)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-muted px-4 text-xs font-bold text-ink transition hover:bg-ink hover:text-white">{action.label}{action.to && <ExternalLink size={12} />}</button>)}</div>}
    {answer.disclaimer && <p className="mt-4 text-[10px] leading-4 text-muted">{answer.disclaimer}</p>}
  </div>;
}

function MealMessage({ response }: { response: MealSuggestionResponse }) {
  return <div>
    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-coral">Based on today’s remaining targets</p>
    <h2 className="mt-1 text-base font-bold">Three practical meal directions</h2>
    <p className="mt-2 text-sm leading-6 text-muted">You have approximately {response.remainingCalories} kcal and {response.remainingProtein} g protein remaining. These options are filtered through your saved dietary pattern.</p>
    <div className="mt-4 max-w-3xl divide-y divide-line border-y border-line">{response.suggestions.map((item) => <div key={item.name} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="text-sm font-bold">{item.name}</p><p className="mt-1 text-xs leading-5 text-muted">{item.ingredients}</p></div><p className="text-xs font-bold">{item.calories} kcal · {item.protein}P</p><Link to={`/log?tab=meal&food=${encodeURIComponent(item.name)}`} className="inline-flex items-center gap-1 text-xs font-bold text-coral">Build meal <ArrowRight size={12} /></Link></div>)}</div>
    <p className="mt-3 text-[10px] text-muted">{response.disclaimer}</p>
  </div>;
}

function FinishMessage({ response }: { response: FinishDayResponse }) {
  return <div>
    <p className="text-[10px] font-bold uppercase tracking-[.12em] text-violet">Finish my day</p>
    <h2 className="mt-1 text-base font-bold">{response.summary}</h2>
    <div className="mt-4 max-w-3xl divide-y divide-line border-y border-line">{response.actions.map((item) => <div key={`${item.category}-${item.title}`} className="flex gap-4 py-3"><span className="w-20 shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted">{item.category}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.title}</p><p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p></div>{item.to && <Link to={item.to} aria-label={`Open ${item.category}`} className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted text-ink"><ArrowRight size={14} /></Link>}</div>)}</div>
  </div>;
}
