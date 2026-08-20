import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Droplets,
  Dumbbell,
  Flame,
  Moon,
  RefreshCw,
  Sparkles,
  Settings2,
  Target,
  Utensils,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CompactRow,
  MetricItem,
  MetricStrip,
  PillButton,
  SectionHeader,
  SegmentedControl,
} from "../components/ui";
import { api } from "../services/api";
import type {
  AiInsight,
  ApiWorkout,
  CalendarMonth,
  DashboardSummary,
  ProgressSummary,
  SleepSummary,
  StreakSummary,
  Goal,
  TodaySummary,
} from "../types";
import { useAuth } from "../context/auth";

const tooltipStyle = {
  border: "1px solid var(--chart-tooltip-border)",
  background: "var(--chart-tooltip)",
  color: "rgb(var(--text-primary))",
  borderRadius: "12px",
  boxShadow: "0 12px 30px rgba(0,0,0,.08)",
  fontSize: "12px",
  fontWeight: 600,
};
const statusStyle = {
  ON_TRACK: "bg-[#e9ffef] text-[#218c49]",
  PARTIAL: "bg-[#fff6e8] text-[#9b641b]",
  OFF_TRACK: "bg-[#fff1ef] text-coral",
  NO_DATA: "bg-[#f1f1ee] text-muted",
} as const;
const localIso = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [calendar, setCalendar] = useState<CalendarMonth | null>(null);
  const [workouts, setWorkouts] = useState<ApiWorkout[]>([]);
  const [streak, setStreak] = useState<StreakSummary | null>(null);
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [sleep, setSleep] = useState<SleepSummary | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [customisingMetrics, setCustomisingMetrics] = useState(false);
  const [pinnedMetrics, setPinnedMetrics] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("pulse_pinned_metrics") || "null");
      return Array.isArray(stored) && stored.length ? stored.slice(0, 3) : ["Protein", "Water", "Weight"];
    } catch {
      return ["Protein", "Water", "Weight"];
    }
  });
  const [metric, setMetric] = useState("Calories");
  const [error, setError] = useState("");
  const [addingWater, setAddingWater] = useState(false);
  const today = useMemo(() => new Date(), []);
  const load = useCallback(async () => {
    setError("");
    try {
      const [
        dashboard,
        progressData,
        calendarData,
        history,
        streakData,
        insightData,
        sleepData,
        goalData,
        todayData,
      ] = await Promise.all([
        api.getDashboard(),
        api.getProgress("week"),
        api.getHealthCalendar(today.getFullYear(), today.getMonth() + 1),
        api.getWorkouts(),
        api.getStreak(),
        api.getInsights(),
        api.getSleepSummary(),
        api.getGoals(),
        api.getToday(),
      ]);
      setSummary(dashboard);
      setProgress(progressData);
      setCalendar(calendarData);
      setWorkouts(history);
      setStreak(streakData);
      setInsight(insightData);
      setSleep(sleepData);
      setGoals(goalData);
      setTodaySummary(todayData);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load dashboard",
      );
    }
  }, [today]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!summary && error)
    return (
      <Card className="grid min-h-80 place-items-center p-8 text-center">
        <div>
          <p className="font-bold">Dashboard unavailable</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <PillButton
            onClick={() => void load()}
            className="mt-5 bg-ink text-white"
          >
            <RefreshCw size={15} />
            Try again
          </PillButton>
        </div>
      </Card>
    );
  if (!summary)
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 rounded-card bg-white" />
        <div className="h-32 rounded-card bg-white" />
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="h-80 rounded-card bg-white" />
          <div className="h-80 rounded-card bg-white" />
        </div>
      </div>
    );

  const todayDay = calendar?.days.find((day) => day.date === localIso());
  const todayWorkouts = workouts
    .filter((item) => item.startedAt.slice(0, 10) === localIso())
    .slice(0, 2);
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const greeting =
    today.getHours() < 12
      ? "Good morning"
      : today.getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  const activityConfig =
    metric === "Workouts"
      ? { key: "workouts", unit: "sessions", color: "#7357ff" }
      : metric === "Water"
        ? { key: "waterMl", unit: "ml", color: "#28a8d8" }
        : { key: "calories", unit: "kcal", color: "#ff6b57" };
  const activityData = (progress?.timeline ?? []).map((item) => ({
    ...item,
    label: new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
      weekday: "short",
    }),
  }));
  const activityTotal = activityData.reduce(
    (total, item) =>
      total + Number(item[activityConfig.key as keyof typeof item] ?? 0),
    0,
  );
  const categoryRows = todayDay
    ? ([
        [
          "Nutrition",
          todayDay.nutrition.status,
          `${todayDay.nutrition.calories.toLocaleString()} kcal`,
        ],
        [
          "Hydration",
          todayDay.hydration.status,
          `${(todayDay.hydration.amountMl / 1000).toFixed(1)} L`,
        ],
        [
          "Sleep",
          todayDay.sleep.status,
          todayDay.sleep.minutes
            ? `${Math.floor(todayDay.sleep.minutes / 60)}h ${todayDay.sleep.minutes % 60}m`
            : "No entry",
        ],
        [
          "Activity",
          todayDay.activity.status,
          todayDay.activity.workouts
            ? `${todayDay.activity.workouts} workout${todayDay.activity.workouts === 1 ? "" : "s"}`
            : "Neutral",
        ],
      ] as const)
    : [];
  const proteinGoal = goals.find((goal) => goal.status === "ACTIVE" && goal.type === "PROTEIN");
  const waterGoal = goals.find((goal) => goal.status === "ACTIVE" && goal.type === "WATER");
  const workoutGoal = goals.find((goal) => goal.status === "ACTIVE" && goal.type === "WORKOUT_FREQUENCY");
  const effectiveProteinTarget = proteinGoal ? Math.round(proteinGoal.targetValue) : summary.proteinTarget;
  const effectiveWaterTarget = waterGoal ? Math.round(waterGoal.targetValue) : summary.waterTarget;
  const proteinRemaining = Math.max(0, effectiveProteinTarget - summary.protein);
  const waterRemaining = Math.max(0, effectiveWaterTarget - summary.water);
  const workoutsRemaining = workoutGoal ? Math.max(0, Math.ceil(workoutGoal.targetValue - (workoutGoal.currentValue ?? 0))) : 0;
  const action:
    | { label: string; to: string }
    | { label: string; onClick: () => Promise<void> } =
    waterRemaining > 0 && summary.water < effectiveWaterTarget * 0.9
      ? {
          label: "+250 ml water",
          onClick: async () => {
            setAddingWater(true);
            try {
              await api.addWater(250);
              await load();
            } finally {
              setAddingWater(false);
            }
          },
        }
      : proteinRemaining > 0
        ? { label: `${proteinRemaining}g protein remaining`, to: "/insights" }
        : workoutsRemaining > 0
          ? { label: `${workoutsRemaining} workout${workoutsRemaining === 1 ? "" : "s"} left this week`, to: "/log?type=Workout" }
          : !sleep?.lastNightMinutes
            ? { label: "Log last night", to: "/log?type=Sleep" }
            : { label: "Log health data", to: "/log" };
  const recentCalendar =
    calendar?.days.filter((day) => day.date <= localIso()).slice(-14) ?? [];
  const activeGoals = goals.filter((goal) => goal.status === "ACTIVE").slice(0, 3);
  const pinnedOptions = ["Calories", "Protein", "Water", "Sleep", "Weight", "Workouts"];
  const pinnedValue = (name: string) => {
    if (name === "Calories") return { value: summary.calories.toLocaleString(), detail: `${Math.max(0, summary.calorieTarget - summary.calories)} kcal left` };
    if (name === "Protein") return { value: `${summary.protein}g`, detail: `${Math.max(0, summary.proteinTarget - summary.protein)}g left` };
    if (name === "Water") return { value: `${(summary.water / 1000).toFixed(1)}L`, detail: `${Math.max(0, summary.waterTarget - summary.water)} ml left` };
    if (name === "Sleep") return { value: sleep?.lastNightMinutes ? `${Math.floor(sleep.lastNightMinutes / 60)}h ${sleep.lastNightMinutes % 60}m` : "—", detail: sleep?.averageQuality ? `Quality ${sleep.averageQuality.toFixed(1)}/5` : "No entry" };
    if (name === "Weight") return { value: summary.weight ? `${summary.weight.toFixed(1)} kg` : "—", detail: "Latest measurement" };
    return { value: `${todayWorkouts.length}`, detail: todayWorkouts.length === 1 ? "Workout today" : "Workouts today" };
  };
  const updatePinned = (index: number, value: string) => {
    const next = [...pinnedMetrics];
    next[index] = value;
    setPinnedMetrics(next);
    localStorage.setItem("pulse_pinned_metrics", JSON.stringify(next));
  };

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted">
            {today.toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="text-[32px] font-bold leading-none tracking-[-.05em] md:text-[36px]">
            {greeting}, {firstName}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Your health, prioritised for today.
          </p>
        </div>
        <Link
          to="/progress"
          className="inline-flex h-10 items-center gap-2 self-start rounded-full bg-white px-4 text-xs font-semibold shadow-sm sm:self-auto"
        >
          <CalendarDays size={15} />
          View month
        </Link>
      </header>

      <MetricStrip className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        <MetricItem
          label="Calories"
          value={summary.calories.toLocaleString()}
          detail={`${Math.max(0, summary.calorieTarget - summary.calories).toLocaleString()} kcal remaining`}
          icon={<Flame size={16} />}
          accent="bg-coral"
        />
        <MetricItem
          label="Protein"
          value={`${summary.protein}g`}
          detail={`${summary.proteinTarget - summary.protein > 0 ? summary.proteinTarget - summary.protein : 0}g remaining`}
          icon={<Utensils size={16} />}
          accent="bg-violet"
        />
        <MetricItem
          label="Water"
          value={`${(summary.water / 1000).toFixed(1)}L`}
          detail={`${Math.max(0, summary.waterTarget - summary.water).toLocaleString()} ml remaining`}
          icon={<Droplets size={16} />}
          accent="bg-cyan"
        />
        <MetricItem
          label="Sleep"
          value={
            sleep?.lastNightMinutes
              ? `${Math.floor(sleep.lastNightMinutes / 60)}h ${sleep.lastNightMinutes % 60}m`
              : "—"
          }
          detail={
            sleep?.averageQuality
              ? `Quality ${sleep.averageQuality.toFixed(1)}/5`
              : "No recent entry"
          }
          icon={<Moon size={16} />}
          accent="bg-[#9b80ff]"
        />
        <MetricItem
          label="Activity"
          value={todayWorkouts[0]?.name || "—"}
          detail={
            todayWorkouts.length
              ? `${todayWorkouts.reduce((sum, item) => sum + item.durationMinutes, 0)} min today`
              : "No workout logged"
          }
          icon={<Dumbbell size={16} />}
          accent="bg-[#2ba75c]"
        />
      </MetricStrip>

      <div className="mt-4 grid gap-4 xl:grid-cols-[.72fr_1.28fr]">
        <Card className="overflow-hidden border-0 bg-ink p-5 text-white shadow-none md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                Today
              </p>
              <h2 className="mt-1 text-xl font-bold">Daily health</h2>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${statusStyle[todayDay?.status ?? "NO_DATA"]}`}
            >
              {(todayDay?.status ?? "NO_DATA").replace("_", " ")}
            </span>
          </div>
          <div className="mt-5 flex items-center gap-5">
            <div
              className="grid size-28 shrink-0 place-items-center rounded-full p-[7px]"
              style={{
                background: `conic-gradient(#f2604b ${(todayDay?.score ?? 0) * 3.6}deg, rgba(255,255,255,.1) 0deg)`,
              }}
            >
              <div className="grid size-full place-items-center rounded-full bg-ink text-center">
                <div>
                  <p className="text-[34px] font-bold leading-none tracking-[-.05em]">
                    {todayDay?.score ?? 0}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[.12em] text-white/35">
                    of 100
                  </p>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 divide-y divide-white/10">
              {categoryRows.map(([label, status, value]) => (
                <div key={label} className="flex items-center py-2">
                  <span
                    className={`mr-2 size-1.5 rounded-full ${status === "ON_TRACK" ? "bg-[#65d68d]" : status === "PARTIAL" ? "bg-amber" : status === "OFF_TRACK" ? "bg-coral" : "bg-white/20"}`}
                  />
                  <span className="flex-1 text-xs font-semibold">{label}</span>
                  <span className="truncate text-[10px] text-white/45">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {"to" in action ? (
            <Link
              to={action.to}
              className="mt-5 flex h-9 items-center justify-center rounded-full bg-white text-xs font-bold text-ink"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              disabled={addingWater}
              onClick={() => void action.onClick()}
              className="mt-5 flex h-9 w-full items-center justify-center rounded-full bg-white text-xs font-bold text-ink disabled:opacity-50"
            >
              {addingWater ? "Adding…" : action.label}
            </button>
          )}
        </Card>
        <Card className="p-5 md:p-6">
          <SectionHeader
            title="Weekly activity"
            description={`${Math.round(activityTotal).toLocaleString()} ${activityConfig.unit} this week`}
            action={
              <SegmentedControl
                options={["Calories", "Workouts", "Water"]}
                value={metric}
                onChange={setMetric}
              />
            }
          />
          <div className="mt-4 h-[230px]">
            {activityData.length ? (
              <ResponsiveContainer>
                <BarChart data={activityData} barCategoryGap="36%">
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--chart-label)", fontSize: 11 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "#f7f7f4" }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar
                    dataKey={activityConfig.key}
                    fill={activityConfig.color}
                    radius={[6, 6, 2, 2]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-2xl bg-[#f7f7f4] text-sm text-muted">
                No activity data this week.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr_.85fr]">
        <Card className="p-5">
          <SectionHeader
            title="Today timeline"
            description="Everything recorded today, in order"
            action={<Clock3 size={15} className="text-muted" />}
          />
          <div className="mt-3 divide-y divide-line">
            {todaySummary?.timeline.length ? (
              todaySummary.timeline.slice(-5).map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={item.to}
                  className="group flex items-center gap-3 py-2.5"
                >
                  <time className="w-12 shrink-0 text-[10px] font-semibold text-muted">
                    {item.time ? item.time.slice(0, 5) : "Today"}
                  </time>
                  <span className={`size-2 rounded-full ${item.type === "WATER" ? "bg-cyan" : item.type === "SLEEP" ? "bg-violet" : item.type === "MEAL" ? "bg-coral" : item.type === "WORKOUT" ? "bg-success" : "bg-ink"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink">{item.title}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted">{item.detail}</p>
                  </div>
                  <ArrowRight size={13} className="text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              ))
            ) : (
              <div className="py-7 text-center">
                <p className="text-sm font-bold">Nothing logged today</p>
                <p className="mt-1 text-xs text-muted">Your meals, water and activity will appear here.</p>
                <Link to="/log" className="mt-3 inline-block text-xs font-bold text-coral">Log something</Link>
              </div>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Health highlights" description="Patterns supported by your records" />
          <div className="mt-3 divide-y divide-line">
            {todaySummary?.highlights.map((highlight) => (
              <div key={`${highlight.type}-${highlight.title}`} className="py-3 first:pt-1">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${highlight.tone === "SUCCESS" ? "bg-success" : highlight.tone === "WARNING" ? "bg-warning" : "bg-muted"}`} />
                  <p className="text-xs font-bold text-ink">{highlight.title}</p>
                </div>
                <p className="mt-1.5 pl-4 text-[11px] leading-4 text-muted">{highlight.detail}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeader
            title="Pinned metrics"
            description="Your three priorities"
            action={
              <button type="button" onClick={() => setCustomisingMetrics((value) => !value)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-muted" aria-label="Customise pinned metrics">
                <Settings2 size={14} />
              </button>
            }
          />
          <div className="mt-3 divide-y divide-line">
            {pinnedMetrics.map((name, index) => {
              const metricValue = pinnedValue(name);
              return (
                <div key={`${name}-${index}`} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    {customisingMetrics ? (
                      <select value={name} onChange={(event) => updatePinned(index, event.target.value)} className="rounded-lg bg-surface-muted px-2 py-1 text-xs font-bold outline-none">
                        {pinnedOptions.map((option) => <option key={option}>{option}</option>)}
                      </select>
                    ) : <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted">{name}</p>}
                    <p className="mt-1 text-[10px] text-muted">{metricValue.detail}</p>
                  </div>
                  <p className="text-lg font-bold tracking-[-.03em] text-ink">{metricValue.value}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <SectionHeader
            title="Health calendar"
            description="Your last 14 days"
            action={
              <Link to="/progress" className="text-xs font-bold">
                Open <ArrowRight size={13} className="inline" />
              </Link>
            }
          />
          <div className="mt-4 grid grid-cols-7 gap-2">
            {recentCalendar.map((day) => (
              <Link
                to="/progress"
                key={day.date}
                title={`${day.date}: ${day.status.replace("_", " ")}`}
                className={`grid aspect-square place-items-center rounded-xl text-[11px] font-bold ${statusStyle[day.status]}`}
              >
                {Number(day.date.slice(-2))}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-muted">Current streak</span>
            <span className="font-bold">
              <Flame size={13} className="mr-1 inline text-coral" />
              {streak?.current ?? 0} days
            </span>
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeader
            title="Today’s context"
            description="Act on what needs attention"
          />
          <div className="mt-2">
            {todayWorkouts.length ? (
              todayWorkouts.map((item) => (
                <CompactRow
                  key={item.id}
                  title={item.name}
                  detail={`${item.exerciseCount} exercises · completed`}
                  leading={
                    <span className="grid size-9 place-items-center rounded-xl bg-[#eeeaff] text-violet">
                      <Dumbbell size={16} />
                    </span>
                  }
                  trailing={
                    <span className="text-xs font-bold">
                      {item.durationMinutes} min
                    </span>
                  }
                />
              ))
            ) : (
              <CompactRow
                title="No workout yet"
                detail="Activity remains neutral until you log one"
                leading={
                  <span className="grid size-9 place-items-center rounded-xl bg-[#f1f1ee] text-muted">
                    <Dumbbell size={16} />
                  </span>
                }
                trailing={
                  <Link
                    to="/log?type=Workout"
                    className="text-[11px] font-bold text-violet"
                  >
                    Log
                  </Link>
                }
              />
            )}
            <CompactRow
              title={
                summary.protein < effectiveProteinTarget
                  ? `${effectiveProteinTarget - summary.protein}g protein remaining`
                  : "Protein target reached"
              }
              detail={`${summary.protein}g of ${effectiveProteinTarget}g today${proteinGoal ? " · goal" : ""}`}
              leading={
                <span className="grid size-9 place-items-center rounded-xl bg-[#fff1ef] text-coral">
                  <Utensils size={16} />
                </span>
              }
              trailing={
                summary.protein < effectiveProteinTarget ? (
                  <Link
                    to="/log?type=Meal"
                    className="text-[11px] font-bold text-coral"
                  >
                    Log food
                  </Link>
                ) : (
                  <Check size={15} className="text-success" />
                )
              }
            />
            <CompactRow
              title={`${summary.water.toLocaleString()} ml hydration`}
              detail={`${Math.max(0, effectiveWaterTarget - summary.water).toLocaleString()} ml remaining${waterGoal ? " · goal" : ""}`}
              leading={
                <span className="grid size-9 place-items-center rounded-xl bg-[#eaf8ff] text-cyan">
                  <Droplets size={16} />
                </span>
              }
              trailing={
                summary.water < effectiveWaterTarget ? (
                  <button
                    type="button"
                    disabled={addingWater}
                    onClick={async () => {
                      setAddingWater(true);
                      try {
                        await api.addWater(250);
                        await load();
                      } finally {
                        setAddingWater(false);
                      }
                    }}
                    className="text-[11px] font-bold text-cyan"
                  >
                    +250 ml
                  </button>
                ) : (
                  <Check size={15} className="text-success" />
                )
              }
            />
            <CompactRow
              title={
                sleep?.lastNightMinutes
                  ? `${Math.floor(sleep.lastNightMinutes / 60)}h ${sleep.lastNightMinutes % 60}m sleep`
                  : "Sleep not logged"
              }
              detail={
                sleep?.lastNightMinutes
                  ? `Quality ${sleep.averageQuality.toFixed(1)}/5`
                  : "Add last night’s recovery"
              }
              leading={
                <span className="grid size-9 place-items-center rounded-xl bg-[#f1efff] text-violet">
                  <Moon size={16} />
                </span>
              }
              trailing={
                !sleep?.lastNightMinutes ? (
                  <Link
                    to="/log?type=Sleep"
                    className="text-[11px] font-bold text-violet"
                  >
                    Log
                  </Link>
                ) : undefined
              }
            />
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Your goals" description="What you’re working toward" action={<Link to="/goals" className="text-xs font-bold">View all <ArrowRight size={13} className="inline"/></Link>}/>
          <div className="mt-2">{activeGoals.length ? activeGoals.map(goal => <Link key={goal.id} to="/goals" className="block border-b border-line py-3 last:border-0"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-bold">{goal.title}</p><p className="mt-0.5 text-[10px] text-muted">{goal.currentValue == null ? "Awaiting data" : `${goal.currentValue.toFixed(goal.currentValue % 1 ? 1 : 0)} ${goal.unit}`}</p></div><span className="text-xs font-bold">{Math.round(goal.progress)}%</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-coral" style={{width:`${goal.progress}%`}}/></div></Link>) : <div className="py-6 text-center"><Target size={18} className="mx-auto text-muted"/><p className="mt-2 text-xs text-muted">No active goals yet.</p><Link to="/goals?new=1" className="mt-2 inline-block text-xs font-bold text-coral">Create goal</Link></div>}</div>
        </Card>
        <Card className="border-0 bg-[#eef0ff] p-5 shadow-none">
          <div className="flex items-center gap-2 text-violet">
            <Sparkles size={15} fill="currentColor" />
            <p className="text-[10px] font-extrabold uppercase tracking-[.14em]">
              Personal insight
            </p>
          </div>
          <h2 className="mt-4 text-xl font-bold leading-tight tracking-[-0.025em]">
            {insight?.summary ||
              "Your personalised overview is being prepared."}
          </h2>
          <div className="mt-4 rounded-2xl bg-white/65 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted">
              Next best action
            </p>
            <p className="mt-1 text-sm leading-5 text-[#606073]">
              {insight?.recommendations?.[0] ||
                "Keep logging consistently to unlock a recommendation."}
            </p>
          </div>
          <Link
            to="/insights"
            className="mt-4 inline-flex items-center gap-1 text-xs font-bold"
          >
            View all insights <ArrowRight size={13} />
          </Link>
        </Card>
      </div>
      {todayDay?.wins?.length ? (
        <p className="mt-4 flex items-center gap-2 px-1 text-xs text-muted">
          <Check size={14} className="text-[#2ba75c]" />
          {todayDay.wins[0]}
        </p>
      ) : null}
    </div>
  );
}
