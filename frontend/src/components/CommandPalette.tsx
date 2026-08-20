import { useEffect, useMemo, useState } from "react";
import { Apple, BarChart3, Brain, CirclePlus, Droplets, Dumbbell, LayoutDashboard, Search, Settings, Target, Utensils, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

type Result = { key: string; label: string; detail: string; to?: string; icon: typeof Search; action?: () => Promise<void> };

const commands: Result[] = [
  { key: "dashboard", label: "Dashboard", detail: "Today’s health overview", to: "/dashboard", icon: LayoutDashboard },
  { key: "log", label: "Log health data", detail: "Meal, workout, water, sleep or body", to: "/log", icon: CirclePlus },
  { key: "workouts", label: "Workouts", detail: "History and exercise library", to: "/workouts", icon: Dumbbell },
  { key: "nutrition", label: "Nutrition", detail: "Meals and macro targets", to: "/nutrition", icon: Utensils },
  { key: "progress", label: "Progress", detail: "Calendar and trends", to: "/progress", icon: BarChart3 },
  { key: "goals", label: "View goals", detail: "Progress, timelines and projections", to: "/goals", icon: Target },
  { key: "new-goal", label: "Create goal", detail: "Set a measurable health target", to: "/goals?new=1", icon: Target },
  { key: "plans", label: "Plans", detail: "Workout, meal and grocery plans", to: "/plans", icon: Target },
  { key: "insights", label: "Ask Circle", detail: "Questions and personalised recommendations", to: "/insights", icon: Brain },
  { key: "settings", label: "Settings", detail: "Profile, diet, targets and reminders", to: "/settings", icon: Settings },
  { key: "water", label: "Water history", detail: "Hydration detail", to: "/water", icon: Apple },
  { key: "sleep", label: "Sleep history", detail: "Recovery detail", to: "/sleep", icon: Apple },
  { key: "body", label: "Body measurements", detail: "Weight and measurements", to: "/body", icon: Apple },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<Result[]>([]);
  const [working, setWorking] = useState("");
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    void Promise.allSettled([api.getExercises(), api.getFoods(), api.getWorkouts(), api.getMealPlans(), api.getWorkoutPlans()]).then((results) => {
      const [exercises, foods, workouts, meals, workoutPlans] = results.map(result => result.status === "fulfilled" ? result.value : []);
      setRemote([
        ...(exercises as Awaited<ReturnType<typeof api.getExercises>>).slice(0, 60).map(item => ({ key: `exercise-${item.id}`, label: item.name, detail: `${item.muscleGroup} · ${item.equipment}`, to: `/workouts?tab=library&query=${encodeURIComponent(item.name)}`, icon: Dumbbell })),
        ...(foods as Awaited<ReturnType<typeof api.getFoods>>).slice(0, 40).map(item => ({ key: `food-${item.id}`, label: item.name, detail: "Food", to: `/log?type=Meal&food=${encodeURIComponent(item.name)}`, icon: Utensils })),
        ...(workouts as Awaited<ReturnType<typeof api.getWorkouts>>).slice(0, 20).map(item => ({ key: `workout-${item.id}`, label: item.name, detail: "Workout history", to: `/workouts/${item.id}`, icon: Dumbbell })),
        ...(meals as Awaited<ReturnType<typeof api.getMealPlans>>).slice(0, 10).map(item => ({ key: `meal-plan-${item.id}`, label: item.name, detail: "Meal plan", to: "/plans?tab=meals", icon: Target })),
        ...(workoutPlans as Awaited<ReturnType<typeof api.getWorkoutPlans>>).slice(0, 10).map(item => ({ key: `workout-plan-${item.id}`, label: item.name, detail: "Workout plan", to: "/plans?tab=workouts", icon: Target })),
      ]);
    });
    return () => window.removeEventListener("keydown", close);
  }, [open, onClose]);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const dynamic: Result[] = [];
    const water = needle.match(/^(\d+(?:\.\d+)?)\s*(ml|l)(?:\s+water)?$/);
    if (water) { const amount = Math.round(Number(water[1]) * (water[2] === "l" ? 1000 : 1)); if (amount > 0 && amount <= 5000) dynamic.push({ key:"quick-water", label:`Log ${amount.toLocaleString()} ml water`, detail:"Add directly to today’s hydration", icon:Droplets, action:async()=>{setWorking("Adding water…");await api.addWater(amount);} }); }
    const weight = needle.match(/^(?:log\s+)?(\d{2,3}(?:\.\d+)?)\s*kg$/);
    if (weight) dynamic.push({key:"quick-weight",label:`Log ${weight[1]} kg`,detail:"Open body logging with this value",to:`/log?type=Body&weight=${weight[1]}`,icon:Target});
    if (needle.includes("scan barcode")) dynamic.push({key:"scan",label:"Scan barcode",detail:"Open nutrition barcode scanner",to:"/log?type=Meal&scan=1",icon:Utensils});
    if (needle.includes("start workout") || needle.includes("build workout")) dynamic.push({key:"start-workout",label:"Build a workout",detail:"Open the workout builder",to:"/workouts/new",icon:Dumbbell});
    if (needle.includes("open calendar") || needle.includes("show progress")) dynamic.push({key:"open-calendar",label:"Open health calendar",detail:"Review daily adherence",to:"/progress",icon:BarChart3});
    if (needle.startsWith("goal ")) dynamic.push({key:"parsed-goal",label:"Create a trackable goal",detail:query.trim(),to:"/goals?new=1",icon:Target});
    if (/^(why|how|what|when|which|am i|suggest)/.test(needle)) dynamic.push({key:"ask-circle",label:"Ask Circle",detail:query.trim(),to:`/insights?q=${encodeURIComponent(query.trim())}`,icon:Brain});
    return [...dynamic, ...commands, ...remote].filter(item => dynamic.includes(item) || !needle || `${item.label} ${item.detail}`.toLowerCase().includes(needle)).slice(0, 12);
  }, [query, remote]);
  const select = async (result: Result) => { if (result.action) { try { await result.action(); } finally { setWorking(""); } } if (result.to) navigate(result.to); onClose(); };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/25 px-4 pt-[10vh] backdrop-blur-sm" onMouseDown={onClose} role="presentation">
      <section className="mx-auto max-w-[640px] overflow-hidden rounded-[24px] border border-line bg-surface text-ink shadow-2xl" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Ask or log anything">
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search size={19} className="text-muted" />
          <input autoFocus value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && results[0]) void select(results[0]); }} className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none" placeholder="Ask or log anything…" />
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-surface-muted" aria-label="Close search"><X size={15}/></button>
        </div>
        <div className="max-h-[56vh] overflow-y-auto p-2">
          {working && <p className="px-4 py-3 text-xs font-semibold text-coral">{working}</p>}
          {results.map(({ key, label, detail, icon: Icon }, index) => <button key={key} type="button" onClick={() => void select(results[index])} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-surface-muted focus:bg-surface-muted focus:outline-none">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-ink"><Icon size={17}/></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{label}</span><span className="block truncate text-xs text-muted">{detail}</span></span>
            {index === 0 && <span className="rounded-md bg-surface-muted px-2 py-1 text-[10px] font-bold text-muted">↵</span>}
          </button>)}
          {!results.length && <div className="px-5 py-10 text-center"><p className="font-semibold">No results</p><p className="mt-1 text-sm text-muted">Try a page, exercise, food, workout or plan name.</p></div>}
        </div>
        <footer className="border-t border-line px-5 py-3 text-[11px] text-muted">Try “500ml water”, “72.1kg”, “scan barcode” or ask a question · Esc to close</footer>
      </section>
    </div>
  );
}
