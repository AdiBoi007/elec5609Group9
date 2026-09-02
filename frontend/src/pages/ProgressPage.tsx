import { useEffect, useMemo, useState } from "react";
import { Activity, Download, Droplets, Dumbbell, Flame, MoonStar, TrendingDown, TrendingUp } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HealthCalendar } from "../components/HealthCalendar";
import { Card, MetricItem, MetricStrip, PageHeader, PillButton, SegmentedControl } from "../components/ui";
import { api } from "../services/api";
import type { ApiMeal, ApiWorkout, BodyMeasurement, ComparisonSummary, PersonalRecords, ProgressSummary, RecoverySummary, SleepSummary, WaterSummary } from "../types";
import { GoalsWorkspace } from "./GoalsPage";

const tabs = ["overview", "goals", "training", "nutrition", "recovery", "body"] as const;
type ProgressTab = typeof tabs[number];
const title = (value: string) => value[0].toUpperCase() + value.slice(1);
const minutes = (value: number) => `${Math.floor(value / 60)}h ${Math.round(value % 60)}m`;
const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const tooltipStyle = { border: "1px solid var(--chart-tooltip-border)", background: "var(--chart-tooltip)", borderRadius: 12 };

export default function ProgressPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab")?.toLowerCase();
  const [tab, setTab] = useState<ProgressTab>(tabs.includes(requested as ProgressTab) ? requested as ProgressTab : "overview");
  const [range, setRange] = useState<"week" | "month">("week");
  const [data, setData] = useState<ProgressSummary | null>(null);
  const [comparison, setComparison] = useState<ComparisonSummary | null>(null);
  const [recovery, setRecovery] = useState<RecoverySummary | null>(null);
  const [workouts, setWorkouts] = useState<ApiWorkout[]>([]);
  const [records, setRecords] = useState<PersonalRecords | null>(null);
  const [meals, setMeals] = useState<ApiMeal[]>([]);
  const [sleep, setSleep] = useState<SleepSummary | null>(null);
  const [water, setWater] = useState<WaterSummary | null>(null);
  const [body, setBody] = useState<BodyMeasurement[]>([]);
  const [error, setError] = useState("");

  useEffect(() => { api.getProgress(range).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load progress")); }, [range]);
  useEffect(() => {
    Promise.all([api.getProgressComparison(), api.getRecovery(), api.getWorkouts(), api.getPersonalRecords(), api.getMeals(30), api.getSleepSummary(), api.getWaterSummary(), api.getMeasurements()])
      .then(([nextComparison, nextRecovery, nextWorkouts, nextRecords, nextMeals, nextSleep, nextWater, nextBody]) => { setComparison(nextComparison); setRecovery(nextRecovery); setWorkouts(nextWorkouts); setRecords(nextRecords); setMeals(nextMeals); setSleep(nextSleep); setWater(nextWater); setBody(nextBody); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Some progress details could not be loaded"));
  }, []);
  useEffect(() => { if (tabs.includes(requested as ProgressTab)) setTab(requested as ProgressTab); }, [requested]);

  const chooseTab = (next: ProgressTab) => { setTab(next); const params = new URLSearchParams(searchParams); params.set("tab", next); setSearchParams(params, { replace: true }); };
  const exportCsv = () => {
    if (!data) return;
    const rows = ["date,workouts,duration_minutes,volume_kg,calories,protein_g,water_ml,sleep_hours,weight_kg", ...data.timeline.map((point) => [point.date, point.workouts, point.durationMinutes, point.volumeKg, point.calories, point.protein, point.waterMl, point.sleepHours, point.weight ?? ""].join(","))];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `circle-health-progress-${range}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const chart = useMemo(() => tab === "training" ? { key: "volumeKg", name: "Training volume", detail: "Kilograms moved across completed workouts", color: "#7357ff", bar: true } : tab === "nutrition" ? { key: "calories", name: "Daily energy", detail: "Calories recorded each day", color: "#ff6b57", bar: false } : tab === "recovery" ? { key: "sleepHours", name: "Sleep duration", detail: "Hours recorded each night", color: "#765bd6", bar: false } : tab === "body" ? { key: "weight", name: "Weight trend", detail: "Persisted body measurements", color: "var(--text-primary)", bar: false } : { key: "durationMinutes", name: "Daily consistency", detail: "Workout duration across the selected range", color: "#2ba75c", bar: true }, [tab]);

  return <div>
    <PageHeader eyebrow="History & outcomes" title="Progress" description="Calendar, goals and longitudinal health data in one workspace." action={<div className="flex gap-2"><SegmentedControl options={["Week", "Month"]} value={title(range)} onChange={(value) => setRange(value.toLowerCase() as "week" | "month")}/><PillButton onClick={exportCsv} disabled={!data} className="bg-surface text-ink shadow-sm"><Download size={15}/>Export</PillButton></div>}/>
    {error && <p role="alert" className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">{error}</p>}
    <div className="mb-4 flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface-muted p-1" role="tablist" aria-label="Progress areas">{tabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => chooseTab(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold ${tab === item ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>{title(item)}</button>)}</div>
    {tab === "goals" ? <Card className="p-5 md:p-6"><GoalsWorkspace embedded/></Card> : !data ? <div className="h-72 animate-pulse rounded-card bg-surface"/> : <>
      <MetricStrip className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-5"><MetricItem label="Workouts" value={data.workouts.count} detail={`${data.workouts.workoutsPerWeek.toFixed(1)} per week`} icon={<Dumbbell size={16}/>} accent="bg-violet"/><MetricItem label="Training time" value={minutes(data.workouts.totalDurationMinutes)} detail={`${Math.round(data.workouts.trainingVolumeKg).toLocaleString()} kg volume`} icon={<Activity size={16}/>} accent="bg-green"/><MetricItem label="Avg calories" value={Math.round(data.nutrition.averageCalories).toLocaleString()} detail={`${data.nutrition.calorieTargetDays} target days`} icon={<Flame size={16}/>} accent="bg-coral"/><MetricItem label="Hydration" value={`${Math.round(data.hydration.goalPercentage)}%`} detail={`${Math.round(data.hydration.averageDailyMl).toLocaleString()} ml average`} icon={<Droplets size={16}/>} accent="bg-cyan"/><MetricItem label="Sleep" value={minutes(data.sleep.averageMinutes)} detail={`${data.sleep.averageQuality.toFixed(1)}/5 quality`} icon={<MoonStar size={16}/>} accent="bg-violet"/></MetricStrip>
      {tab === "overview" && <HealthCalendar/>}
      <Card className="mt-4 p-5 md:p-6"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">{title(tab)}</p><h2 className="mt-1 text-xl font-bold">{chart.name}</h2><p className="mt-1 text-sm text-muted">{chart.detail}</p><div className="mt-5 h-[240px]">{data.timeline.some((point) => point[chart.key as keyof typeof point] != null) ? <ResponsiveContainer>{chart.bar ? <BarChart data={data.timeline}><CartesianGrid vertical={false} stroke="var(--chart-grid)"/><XAxis dataKey="date" tickFormatter={formatDate} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--chart-label)" }}/><YAxis hide/><Tooltip contentStyle={tooltipStyle}/><Bar dataKey={chart.key} fill={chart.color} radius={[6, 6, 2, 2]}/></BarChart> : <LineChart data={data.timeline}><CartesianGrid vertical={false} stroke="var(--chart-grid)"/><XAxis dataKey="date" tickFormatter={formatDate} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--chart-label)" }}/><YAxis hide domain={["auto", "auto"]}/><Tooltip contentStyle={tooltipStyle}/><Line type="monotone" dataKey={chart.key} stroke={chart.color} strokeWidth={3} connectNulls dot={{ r: 3, fill: chart.color, stroke: "var(--surface)", strokeWidth: 2 }}/></LineChart>}</ResponsiveContainer> : <div className="grid h-full place-items-center rounded-2xl bg-surface-muted text-sm text-muted">No {tab} data in this range.</div>}</div></Card>
      {tab === "overview" && <OverviewDetails comparison={comparison} recovery={recovery}/>}
      {tab === "training" && <TrainingDetails workouts={workouts} records={records}/>}
      {tab === "nutrition" && <NutritionDetails meals={meals}/>}
      {tab === "recovery" && <RecoveryDetails recovery={recovery} sleep={sleep} water={water}/>}
      {tab === "body" && <BodyDetails measurements={body}/>}
    </>}
  </div>;
}

function OverviewDetails({ comparison, recovery }: { comparison: ComparisonSummary | null; recovery: RecoverySummary | null }) {
  return <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_.55fr]">{comparison && <Card className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-muted">Compare</p><h2 className="mt-1 text-lg font-bold">{comparison.label}</h2><div className="mt-4 grid gap-px overflow-hidden rounded-2xl bg-line sm:grid-cols-2 lg:grid-cols-3">{comparison.metrics.map((metric) => <div key={metric.key} className="bg-surface p-3.5"><p className="text-[10px] font-bold uppercase text-muted">{metric.label}</p><div className="mt-2 flex items-end justify-between"><p className="text-lg font-bold">{Math.round(metric.current).toLocaleString()} <span className="text-[9px] text-muted">{metric.unit}</span></p>{metric.percentChange != null && <span className={`flex items-center text-[10px] font-bold ${metric.percentChange >= 0 ? "text-success" : "text-coral"}`}>{metric.percentChange >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>} {Math.abs(metric.percentChange)}%</span>}</div></div>)}</div></Card>}{recovery && <RecoveryCard recovery={recovery}/>}</div>;
}

function RecoveryCard({ recovery }: { recovery: RecoverySummary }) { return <Card className="border-0 bg-ink p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-white/45">Recovery</p><p className="mt-2 text-4xl font-bold">{recovery.score} <span className="text-xs text-white/55">{recovery.rating}</span></p><div className="mt-4 space-y-2">{[["Sleep", recovery.sleepScore], ["Hydration", recovery.hydrationScore], ["Training load", recovery.trainingLoadScore]].map(([label, value]) => <div key={String(label)} className="flex items-center gap-2 text-xs"><span className="w-24 text-white/55">{label}</span><div className="h-1 flex-1 rounded-full bg-white/10"><div className="h-full rounded-full bg-violet" style={{ width: `${value}%` }}/></div><span>{value}</span></div>)}</div><p className="mt-4 text-[10px] leading-4 text-white/45">{recovery.disclaimer}</p></Card>; }

function TrainingDetails({ workouts, records }: { workouts: ApiWorkout[]; records: PersonalRecords | null }) { return <Card className="mt-4 p-5 md:p-6"><div className="flex items-end justify-between"><div><h2 className="text-xl font-bold">Workout history</h2><p className="mt-1 text-sm text-muted">Completed sessions and recorded personal bests.</p></div><Link to="/log?tab=workout" className="text-xs font-bold text-violet">Log workout</Link></div><div className="mt-4 divide-y divide-line">{workouts.slice(0, 12).map((workout) => <Link key={workout.id} to={`/workouts/${workout.id}`} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-sm font-bold">{workout.name}</p><p className="text-xs text-muted">{new Date(workout.startedAt).toLocaleDateString()} · {workout.exerciseCount} exercises</p></div><p className="text-xs font-bold">{workout.durationMinutes} min{workout.trainingVolumeKg ? ` · ${Math.round(workout.trainingVolumeKg).toLocaleString()} kg` : ""}</p></Link>)}</div>{records && <div className="mt-4 flex flex-wrap gap-2">{records.exerciseRecords.slice(0, 8).map((record) => <span key={record.exercise} className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold">{record.exercise} · {record.highestWeightKg} kg</span>)}</div>}</Card>; }

function NutritionDetails({ meals }: { meals: ApiMeal[] }) { return <Card className="mt-4 p-5 md:p-6"><div className="flex items-end justify-between"><div><h2 className="text-xl font-bold">Meal history</h2><p className="mt-1 text-sm text-muted">Persisted meals, quality and dietary compatibility.</p></div><Link to="/log?tab=meal" className="text-xs font-bold text-coral">Log meal</Link></div><div className="mt-4 divide-y divide-line">{meals.slice(0, 14).map((meal) => <div key={meal.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-sm font-bold">{meal.name}</p><p className="text-xs text-muted">{new Date(meal.eatenAt).toLocaleString()} · {meal.mealType} · {meal.qualityRating}</p></div><p className="text-xs font-bold">{Math.round(meal.calories)} kcal · {Math.round(meal.protein)}g protein</p></div>)}</div></Card>; }

function RecoveryDetails({ recovery, sleep, water }: { recovery: RecoverySummary | null; sleep: SleepSummary | null; water: WaterSummary | null }) { return <div className="mt-4 grid gap-4 lg:grid-cols-3">{recovery && <RecoveryCard recovery={recovery}/>}<Card className="p-5"><h2 className="font-bold">Sleep history</h2><p className="mt-2 text-3xl font-bold">{sleep ? minutes(sleep.averageMinutes) : "—"}</p><p className="text-xs text-muted">Average · {sleep?.averageQuality.toFixed(1) ?? "—"}/5 quality</p><div className="mt-4 divide-y divide-line">{sleep?.history.slice(0, 5).map((item) => <div key={item.id} className="flex justify-between py-2 text-xs"><span>{new Date(`${item.date}T00:00:00`).toLocaleDateString()}</span><b>{minutes(item.durationMinutes)}</b></div>)}</div></Card><Card className="p-5"><h2 className="font-bold">Hydration</h2><p className="mt-2 text-3xl font-bold">{water ? `${Math.round(water.sevenDayAverage).toLocaleString()} ml` : "—"}</p><p className="text-xs text-muted">Seven-day daily average</p><div className="mt-4 divide-y divide-line">{water?.history.slice(-5).reverse().map((item) => <div key={item.date} className="flex justify-between py-2 text-xs"><span>{new Date(`${item.date}T00:00:00`).toLocaleDateString()}</span><b>{item.value.toLocaleString()} ml</b></div>)}</div></Card></div>; }

function BodyDetails({ measurements }: { measurements: BodyMeasurement[] }) { return <Card className="mt-4 p-5 md:p-6"><div className="flex items-end justify-between"><div><h2 className="text-xl font-bold">Body measurement history</h2><p className="mt-1 text-sm text-muted">Weight, composition and circumference records.</p></div><Link to="/log?tab=body" className="text-xs font-bold">Add measurement</Link></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="text-muted"><tr>{["Date", "Weight", "Body fat", "Waist", "Chest", "Hips", "Arms", "Thighs"].map((label) => <th key={label} className="border-b border-line py-3 pr-4 font-semibold">{label}</th>)}</tr></thead><tbody>{measurements.slice(0, 20).map((item) => <tr key={item.id} className="border-b border-line"><td className="py-3 pr-4 font-semibold">{new Date(`${item.measuredOn}T00:00:00`).toLocaleDateString()}</td><td>{item.weightKg ?? "—"}</td><td>{item.bodyFatPercentage ?? "—"}</td><td>{item.waistCm ?? "—"}</td><td>{item.chestCm ?? "—"}</td><td>{item.hipsCm ?? "—"}</td><td>{item.armsCm ?? "—"}</td><td>{item.thighsCm ?? "—"}</td></tr>)}</tbody></table></div></Card>; }
