import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CirclePlus, Droplets, Dumbbell, Flame, MoonStar, Sparkles, Target, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, MetricItem, MetricStrip, PillButton, SectionHeader } from "../components/ui";
import { useAuth } from "../context/auth";
import { api } from "../services/api";
import type { DashboardSummary, Goal, ProgressSummary, SleepSummary, TodaySummary } from "../types";

const timelineIcon = { MEAL: Utensils, WATER: Droplets, WORKOUT: Dumbbell, SLEEP: MoonStar, BODY: Target } as const;
const timelineTone = { MEAL: "bg-[#fff1ef] text-coral", WATER: "bg-[#eaf8ff] text-cyan", WORKOUT: "bg-[#eeeaff] text-violet", SLEEP: "bg-[#f1efff] text-violet", BODY: "bg-surface-muted text-ink" } as const;

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [sleep, setSleep] = useState<SleepSummary | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingWater, setAddingWater] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const [dashboard, todayData, progressData, sleepData, goalData] = await Promise.all([api.getDashboard(), api.getToday(), api.getProgress("week"), api.getSleepSummary(), api.getGoals()]);
      setSummary(dashboard); setToday(todayData); setProgress(progressData); setSleep(sleepData); setGoals(goalData);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load today’s dashboard"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const firstName = (user?.name || "there").split(" ")[0];
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const activeGoals = goals.filter((goal) => goal.status === "ACTIVE").slice(0, 3);
  const nextAction = useMemo(() => {
    if (!summary || !progress) return { label: "Log health data", to: "/log" };
    const waterRemaining = Math.max(0, summary.waterTarget - summary.water);
    const proteinRemaining = Math.max(0, summary.proteinTarget - summary.protein);
    if (waterRemaining >= 250) return { label: "Add 250 ml water", water: true };
    if (proteinRemaining > 0) return { label: `${proteinRemaining}g protein remaining`, to: "/ai" };
    if (!sleep?.lastNightMinutes) return { label: "Log last night’s sleep", to: "/log?tab=sleep" };
    if (progress.workouts.count === 0) return { label: "Log this week’s first workout", to: "/log?tab=workout" };
    return { label: "Review this week’s progress", to: "/progress" };
  }, [progress, sleep?.lastNightMinutes, summary]);

  if (loading) return <div className="space-y-4"><div className="h-20 animate-pulse rounded-card bg-surface"/><div className="h-32 animate-pulse rounded-card bg-surface"/><div className="h-80 animate-pulse rounded-card bg-surface"/></div>;
  if (!summary) return <Card className="p-8 text-center"><p className="font-bold">Dashboard unavailable</p><p className="mt-2 text-sm text-muted">{error || "No dashboard data was returned."}</p><PillButton onClick={() => void load()} className="mt-4 bg-ink text-white">Try again</PillButton></Card>;
  const calorieRemaining = Math.max(0, summary.calorieTarget - summary.calories);
  const proteinRemaining = Math.max(0, summary.proteinTarget - summary.protein);
  const waterRemaining = Math.max(0, summary.waterTarget - summary.water);
  return <div>
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-1.5 text-xs font-semibold text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p><h1 className="text-[32px] font-bold leading-none tracking-[-.05em] md:text-[36px]">{greeting}, {firstName}</h1><p className="mt-2 text-sm text-muted">A focused view of today—what is logged, what remains and what matters next.</p></div><Link to="/log" className="inline-flex min-h-10 items-center gap-2 self-start rounded-full bg-ink px-4 text-xs font-semibold text-white sm:self-auto"><CirclePlus size={15}/>Log health data</Link></header>
    {error && <p role="alert" className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">{error}</p>}
    <MetricStrip className="grid-cols-2 xl:grid-cols-4"><MetricItem label="Calories" value={summary.calories.toLocaleString()} detail={`${calorieRemaining.toLocaleString()} kcal remaining`} icon={<Flame size={16}/>} accent="bg-coral"/><MetricItem label="Protein" value={`${summary.protein}g`} detail={`${proteinRemaining}g remaining`} icon={<Utensils size={16}/>} accent="bg-amber"/><MetricItem label="Water" value={`${(summary.water / 1000).toFixed(1)}L`} detail={`${waterRemaining.toLocaleString()} ml remaining`} icon={<Droplets size={16}/>} accent="bg-cyan"/><MetricItem label="Sleep" value={sleep?.lastNightMinutes ? `${Math.floor(sleep.lastNightMinutes / 60)}h ${sleep.lastNightMinutes % 60}m` : "—"} detail={sleep?.lastNightMinutes ? `Quality ${sleep.averageQuality.toFixed(1)}/5` : "Not logged"} icon={<MoonStar size={16}/>} accent="bg-violet"/></MetricStrip>
    <Card className="mt-4 flex flex-col gap-4 border-0 bg-ink p-5 text-white md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10"><Sparkles size={17}/></span><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-white/45">Next best action</p><p className="mt-1 text-lg font-bold">{nextAction.label}</p><p className="mt-1 text-xs text-white/50">Based on today’s persisted entries and current targets.</p></div></div>{nextAction.water ? <PillButton disabled={addingWater} onClick={async () => { setAddingWater(true); try { await api.addWater(250); await load(); } finally { setAddingWater(false); } }} className="bg-white text-ink"><Droplets size={15}/>{addingWater ? "Adding…" : "Add now"}</PillButton> : <Link to={nextAction.to ?? "/log"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-ink">Open <ArrowRight size={15}/></Link>}</Card>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.65fr]"><Card className="p-5 md:p-6"><SectionHeader title="Today’s timeline" description="One chronological feed across every health domain" action={<Link to="/log" className="text-xs font-bold">Add entry <ArrowRight size={13} className="inline"/></Link>}/><div className="mt-4 divide-y divide-line">{today?.timeline.map((item) => { const Icon = timelineIcon[item.type]; return <Link key={`${item.type}-${item.id}`} to={normaliseTimelineLink(item.to)} className="flex items-center gap-3 py-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${timelineTone[item.type]}`}><Icon size={17}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.title}</span><span className="block truncate text-xs text-muted">{item.detail}</span></span><span className="text-xs text-muted">{item.time || ""}</span><ArrowRight size={14} className="text-muted"/></Link>; })}{!today?.timeline.length && <div className="py-12 text-center"><CheckCircle2 className="mx-auto text-muted"/><p className="mt-3 font-bold">Nothing logged yet</p><p className="mt-1 text-sm text-muted">Start with a meal, water, workout, sleep or measurement.</p></div>}</div></Card><div className="space-y-4"><Card className="p-5"><SectionHeader title="Highlights" description="Signals from today"/><div className="mt-3 space-y-2">{today?.highlights.map((item, index) => <div key={`${item.type}-${index}`} className="rounded-2xl bg-surface-muted p-3"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${item.tone === "SUCCESS" ? "bg-success" : item.tone === "WARNING" ? "bg-coral" : "bg-muted"}`}/><p className="text-xs font-bold">{item.title}</p></div><p className="mt-1 pl-4 text-xs leading-5 text-muted">{item.detail}</p></div>)}{!today?.highlights.length && <p className="py-4 text-sm text-muted">Highlights appear as you log today.</p>}</div></Card><Card className="p-5"><SectionHeader title="Goals" description="Active outcomes" action={<Link to="/progress?tab=goals" className="text-xs font-bold">Manage</Link>}/><div className="mt-2">{activeGoals.map((goal) => <Link key={goal.id} to="/progress?tab=goals" className="block border-b border-line py-3 last:border-0"><div className="flex justify-between gap-3"><p className="truncate text-xs font-bold">{goal.title}</p><b className="text-xs">{Math.round(goal.progress)}%</b></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-coral" style={{ width: `${goal.progress}%` }}/></div></Link>)}{!activeGoals.length && <div className="py-6 text-center"><Target className="mx-auto text-muted" size={18}/><Link to="/progress?tab=goals&new=1" className="mt-2 inline-block text-xs font-bold text-coral">Create a goal</Link></div>}</div></Card></div></div>
  </div>;
}

function normaliseTimelineLink(to: string) {
  if (to.startsWith("/water")) return "/log?tab=water";
  if (to.startsWith("/sleep")) return "/log?tab=sleep";
  if (to.startsWith("/body")) return "/log?tab=body";
  if (to.startsWith("/nutrition")) return "/progress?tab=nutrition";
  if (to === "/workouts") return "/progress?tab=training";
  return to;
}
