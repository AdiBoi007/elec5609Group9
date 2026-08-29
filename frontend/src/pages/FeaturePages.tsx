import { useEffect, useState } from "react";
import {
  Apple,
  ArrowRight,
  Bell,
  Brain,
  Camera,
  Check,
  ChevronRight,
  CircleGauge,
  Download,
  Droplets,
  MoonStar,
  Plus,
  Printer,
  Scale,
  Sparkles,
  Target,
  Trash2,
  Utensils,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  FormField,
  inputClass,
  Modal,
  PageHeader,
  PillButton,
  SegmentedControl,
} from "../components/ui";
import { weightData } from "../data/mockData";
import { api } from "../services/api";
import { BarcodeScanner } from "../components/BarcodeScanner";
import { DietaryPreferencesEditor } from "../components/DietaryPreferencesEditor";
import type {
  AiInsight,
  DietCompatibility,
  FoodEntry,
  UserProfile,
} from "../types";
import { FITNESS_GOALS, isProfileComplete } from "../types";
import { Link } from "react-router-dom";

const tooltipStyle = {
  border: "0",
  borderRadius: "14px",
  boxShadow: "0 12px 30px rgba(0,0,0,.08)",
  fontSize: "12px",
};

export function NutritionPage() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [range, setRange] = useState("Today");
  const [targets, setTargets] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);
  const [targetsPersonalized, setTargetsPersonalized] = useState(true);
  const [quality, setQuality] = useState({
    score: 0,
    rating: "No score yet",
    positives: [] as string[],
    improvements: [] as string[],
  });
  const [compatibility, setCompatibility] = useState<{
    status: DietCompatibility["status"];
    warnings: string[];
  }>({ status: "UNKNOWN", warnings: [] });
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [mealOpen, setMealOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mealSaving, setMealSaving] = useState(false);
  const [mealError, setMealError] = useState("");
  const [pageError, setPageError] = useState("");
  const [meal, setMeal] = useState({
    name: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const totals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein,
      carbs: acc.carbs + entry.carbs,
      fat: acc.fat + entry.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const multiplier = range === "Week" ? 7 : 1;
  const effectiveTargets = targets && {
    calories: targets.calories * multiplier,
    protein: targets.protein * multiplier,
    carbs: targets.carbs * multiplier,
    fat: targets.fat * multiplier,
  };
  useEffect(() => {
    setLoadingEntries(true);
    setPageError("");
    api
      .getMeals(range === "Week" ? 7 : 1)
      .then((items) => {
        const latestMeal = [...items].sort((a, b) =>
          b.eatenAt.localeCompare(a.eatenAt),
        )[0];
        setCompatibility(
          latestMeal
            ? {
                status: latestMeal.dietCompatibility,
                warnings: latestMeal.dietWarnings,
              }
            : { status: "UNKNOWN", warnings: [] },
        );
        setEntries(
          items.map((item) => ({
            id: item.id,
            name: item.name,
            meal: item.mealType,
            serving: "1 serving",
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbohydrates,
            fat: item.fat,
          })),
        );
        const scored = items.filter((item) => item.qualityScore != null);
        if (scored.length) {
          const latest = [...scored].sort((a, b) =>
            b.eatenAt.localeCompare(a.eatenAt),
          )[0];
          const score = Math.round(
            scored.reduce((sum, item) => sum + item.qualityScore, 0) /
              scored.length,
          );
          const rating =
            score >= 80
              ? "Great"
              : score >= 60
                ? "Good"
                : score >= 40
                  ? "Fair"
                  : "Needs balance";
          setQuality({
            score,
            rating,
            positives: latest.positives,
            improvements: latest.improvements,
          });
        } else
          setQuality({
            score: 0,
            rating: "No score yet",
            positives: [],
            improvements: [],
          });
      })
      .catch((reason) =>
        setPageError(
          reason instanceof Error
            ? reason.message
            : "Unable to load nutrition data",
        ),
      )
      .finally(() => setLoadingEntries(false));
  }, [range]);
  useEffect(() => {
    api
      .getProfile()
      .then((profile) => {
        setTargets({
          calories: profile.calorieTarget ?? 2200,
          protein: profile.proteinTarget ?? 150,
          carbs: profile.carbTarget ?? 250,
          fat: profile.fatTarget ?? 70,
        });
        setTargetsPersonalized(isProfileComplete(profile));
      })
      .catch((reason) =>
        setPageError(
          reason instanceof Error
            ? reason.message
            : "Unable to load nutrition targets",
        ),
      );
  }, []);
  const saveMeal = async () => {
    if (!meal.name.trim()) {
      setMealError("Enter a food or meal name.");
      return;
    }
    if (
      [meal.calories, meal.protein, meal.carbs, meal.fat].some(
        (value) => !Number.isFinite(value) || value < 0,
      )
    ) {
      setMealError("Calories and macros must be zero or positive numbers.");
      return;
    }
    setMealSaving(true);
    setMealError("");
    try {
      const food = await api.createFood({
        name: meal.name.trim(),
        servingSize: 1,
        servingUnit: "serving",
        calories: meal.calories,
        protein: meal.protein,
        carbohydrates: meal.carbs,
        fat: meal.fat,
        fibre: 0,
      });
      const logged = await api.logMeal({
        name: meal.name.trim(),
        mealType: "Snack",
        reusable: true,
        foods: [{ foodId: food.id, quantity: 1, unit: "serving" }],
      });
      setEntries([
        ...entries,
        { id: logged.id, meal: "Snack", serving: "1 serving", ...meal },
      ]);
      setQuality({
        score: logged.qualityScore,
        rating: logged.qualityRating,
        positives: logged.positives,
        improvements: logged.improvements,
      });
      setCompatibility({
        status: logged.dietCompatibility,
        warnings: logged.dietWarnings,
      });
      setMealOpen(false);
      setMeal({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0 });
    } catch (reason) {
      setMealError(
        reason instanceof Error ? reason.message : "Unable to log meal",
      );
    } finally {
      setMealSaving(false);
    }
  };
  return (
    <div>
      <PageHeader
        eyebrow="Fuel"
        title="Nutrition"
        description="Eat with intention without turning every meal into maths."
        action={
          <div className="flex gap-2">
            <PillButton
              onClick={() => setScannerOpen(true)}
              className="bg-white text-ink shadow-sm"
            >
              <Camera size={16} />
              Scan
            </PillButton>
            <PillButton
              onClick={() => setMealOpen(true)}
              className="bg-ink text-white"
            >
              <Plus size={16} />
              Log food
            </PillButton>
          </div>
        }
      />
      {pageError && (
        <p className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">
          {pageError}
        </p>
      )}
      {!targetsPersonalized && (
        <p className="mb-4 rounded-2xl bg-amber/10 p-4 text-sm font-semibold text-ink">
          These are default targets, not personalised for you yet.{" "}
          <Link to="/settings" className="text-coral underline">
            Complete your profile
          </Link>{" "}
          to personalise them.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
        <Card className="p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted">
                {range === "Week" ? "Seven-day energy" : "Daily energy"}
              </p>
              <p className="mt-2 text-[32px] font-bold tracking-[-.05em]">
                {totals.calories.toLocaleString()}{" "}
                <span className="text-lg text-muted">
                  / {effectiveTargets?.calories.toLocaleString() ?? "—"} kcal
                </span>
              </p>
              <p className="mt-1 text-sm font-semibold text-coral">
                {effectiveTargets
                  ? Math.max(
                      0,
                      effectiveTargets.calories - totals.calories,
                    ).toLocaleString()
                  : "—"}{" "}
                kcal remaining
              </p>
            </div>
            <SegmentedControl
              options={["Today", "Week"]}
              value={range}
              onChange={setRange}
            />
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#eeeeeb]">
            <div
              style={{
                width: `${effectiveTargets?.calories ? Math.min(100, (totals.calories / effectiveTargets.calories) * 100) : 0}%`,
              }}
              className="h-full rounded-full bg-coral transition-all"
            />
          </div>
          <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-black/[.055]">
            {[
              ["Protein", totals.protein, effectiveTargets?.protein, "#7357ff"],
              ["Carbs", totals.carbs, effectiveTargets?.carbs, "#28a8d8"],
              ["Fat", totals.fat, effectiveTargets?.fat, "#f3a33c"],
            ].map(([label, value, target, color]) => (
              <div
                key={label as string}
                className="border-r border-black/[.055] bg-[#f7f7f4] p-3 last:border-r-0"
              >
                <span
                  className="block size-2 rounded-full"
                  style={{ background: color as string }}
                />
                <p className="mt-2 text-xl font-bold">{value as number}g</p>
                <p className="text-xs text-muted">
                  of {target == null ? "—" : (target as number)}g{" "}
                  {label as string}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card className={`self-start bg-[#fff7e9] shadow-none ${entries.length ? "p-5 md:p-6" : "p-4"}`}>
          {!entries.length ? (
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-amber">
                <Sparkles size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Meal quality</p>
                <p className="mt-0.5 text-xs text-[#796c55]">Log a meal to see quality and diet compatibility.</p>
              </div>
              <button type="button" onClick={() => setMealOpen(true)} className="text-xs font-bold text-amber">Log food</button>
            </div>
          ) : (<>
          <div className="flex items-center justify-between">
            <span className="grid size-11 place-items-center rounded-2xl bg-white text-amber">
              <Sparkles size={19} />
            </span>
            <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-amber">
              {quality.rating}
            </span>
          </div>
          <p className="mt-4 text-sm font-semibold text-muted">
            Meal quality score
          </p>
          <p className="mt-1 text-[36px] font-bold tracking-[-.06em]">
            {quality.score}
            <span className="text-lg text-muted">/100</span>
          </p>
          <p className="mt-3 text-sm leading-6 text-[#796c55]">
            {quality.score
              ? [...quality.positives, ...quality.improvements]
                  .slice(0, 2)
                  .join(". ")
              : "Log a meal to receive a transparent nutrition-quality score."}
          </p>
          <div className="mt-5 border-t border-[#d9cba9]/50 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-muted">
              Diet compatibility · latest meal
            </p>
            <p
              className={`mt-2 text-sm font-bold ${compatibility.status === "CONFLICT" ? "text-coral" : compatibility.status === "COMPATIBLE" ? "text-[#218c49]" : "text-muted"}`}
            >
              {compatibility.status === "COMPATIBLE"
                ? "No preference conflicts found"
                : compatibility.status === "CONFLICT"
                  ? "Preference conflict found"
                  : "Not verified"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#796c55]">
              {compatibility.warnings[0] ??
                "Compatibility depends on available ingredient metadata and is separate from nutrition quality."}
            </p>
          </div>
          </>)}
        </Card>
      </div>
      <Card className="mt-4 p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {range === "Week" ? "This week’s meals" : "Today’s meals"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {entries.length} entries logged
            </p>
          </div>
          <button
            onClick={() => setMealOpen(true)}
            className="text-sm font-bold text-ink"
          >
            Meal database <ArrowRight className="inline" size={15} />
          </button>
        </div>
        <div className="mt-5 divide-y divide-black/[.055]">
          {entries.map((entry) => (
            <div key={entry.id} className="group flex items-center gap-3 py-3">
              <span className="grid size-9 place-items-center rounded-xl bg-[#fff1ef] text-coral">
                <Utensils size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{entry.name}</p>
                <p className="text-xs text-muted">
                  {entry.meal} · {entry.serving}
                </p>
              </div>
              <div className="hidden items-center gap-5 text-xs sm:flex">
                <span>
                  <b>{entry.protein}g</b> P
                </span>
                <span>
                  <b>{entry.carbs}g</b> C
                </span>
                <span>
                  <b>{entry.fat}g</b> F
                </span>
              </div>
              <p className="w-20 text-right text-sm font-bold">
                {entry.calories} kcal
              </p>
              <button
                onClick={async () => {
                  if (
                    !window.confirm(
                      `Delete ${entry.name} from your nutrition log?`,
                    )
                  )
                    return;
                  setPageError("");
                  try {
                    await api.deleteMeal(entry.id);
                    setEntries((current) =>
                      current.filter((e) => e.id !== entry.id),
                    );
                  } catch (reason) {
                    setPageError(
                      reason instanceof Error
                        ? reason.message
                        : "Unable to delete meal",
                    );
                  }
                }}
                className="text-muted transition hover:text-coral sm:opacity-0 sm:group-hover:opacity-100"
                aria-label={`Delete ${entry.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!loadingEntries && !entries.length && (
            <div className="py-8 text-center">
              <Utensils className="mx-auto text-muted" />
              <h3 className="mt-3 font-bold">Nothing logged yet</h3>
              <p className="mt-2 text-sm text-muted">
                Add your first meal to start tracking today's nutrition.
              </p>
              <div className="mt-4 flex justify-center gap-2"><PillButton onClick={() => setMealOpen(true)} className="min-h-10 bg-ink text-white"><Plus size={14}/>Search food</PillButton><PillButton onClick={() => setScannerOpen(true)} className="min-h-10 bg-[#f1f1ee] text-ink"><Camera size={14}/>Scan barcode</PillButton></div>
            </div>
          )}
        </div>
      </Card>
      {mealOpen && (
        <Modal title="Log food" onClose={() => setMealOpen(false)}>
          <div className="space-y-4">
            <FormField label="Food or meal">
              <input
                autoFocus
                className={inputClass}
                value={meal.name}
                onChange={(e) => setMeal({ ...meal, name: e.target.value })}
                placeholder="e.g. Turkey sandwich"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              {(["calories", "protein", "carbs", "fat"] as const).map((key) => (
                <FormField
                  key={key}
                  label={key[0].toUpperCase() + key.slice(1)}
                >
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={inputClass}
                    value={meal[key]}
                    onChange={(e) =>
                      setMeal({ ...meal, [key]: Number(e.target.value) })
                    }
                  />
                </FormField>
              ))}
            </div>
            {mealError && (
              <p className="text-sm font-semibold text-coral">{mealError}</p>
            )}
            <PillButton
              disabled={mealSaving}
              onClick={saveMeal}
              className="w-full bg-ink text-white"
            >
              {mealSaving ? "Adding…" : "Add to today"}
            </PillButton>
          </div>
        </Modal>
      )}
      {scannerOpen && (
        <Modal title="Scan barcode" onClose={() => setScannerOpen(false)}>
          <BarcodeScanner
            onCancel={() => setScannerOpen(false)}
            onAdded={(item) => {
              setEntries((current) => [
                ...current,
                {
                  id: item.id,
                  name: item.name,
                  meal: item.mealType,
                  serving: "1 serving",
                  calories: item.calories,
                  protein: item.protein,
                  carbs: item.carbohydrates,
                  fat: item.fat,
                },
              ]);
              setQuality({
                score: item.qualityScore,
                rating: item.qualityRating,
                positives: item.positives,
                improvements: item.improvements,
              });
              setCompatibility({
                status: item.dietCompatibility,
                warnings: item.dietWarnings,
              });
              setScannerOpen(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

export function WaterPage() {
  const [water, setWater] = useState(0);
  const [target, setTarget] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<
    Array<{ date: string; value: number }>
  >([]);
  const [average, setAverage] = useState(0);
  const loadWater = async () => {
    const summary = await api.getWaterSummary();
    setWater(summary.todayMl);
    setTarget(summary.targetMl);
    setHistory(summary.history);
    setAverage(summary.sevenDayAverage);
  };
  useEffect(() => {
    setError("");
    loadWater()
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load water data",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  const addWater = async (amount: number) => {
    setSaving(true);
    setError("");
    try {
      await api.addWater(amount);
      await loadWater();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add water",
      );
    } finally {
      setSaving(false);
    }
  };
  const undoWater = async () => {
    setSaving(true);
    setError("");
    try {
      await api.removeLatestWater();
      await loadWater();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to undo water entry",
      );
    } finally {
      setSaving(false);
    }
  };
  const percentage = target
    ? Math.min(100, Math.round((water / target) * 100))
    : 0;
  return (
    <div>
      <PageHeader
        eyebrow="Hydration"
        title="Water"
        description="Small sips, steady energy, clearer thinking."
      />
      {error && (
        <p className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">
          {error}
        </p>
      )}
      {loading ? (
        <div className="h-80 animate-pulse rounded-card bg-white" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_.75fr]">
          <Card className="relative overflow-hidden bg-[#eaf8ff] p-8 shadow-none md:p-10">
            <div className="absolute -right-14 -top-14 size-60 rounded-full bg-cyan/10" />
            <div className="relative">
              <span className="grid size-14 place-items-center rounded-[20px] bg-white text-cyan shadow-sm">
                <Droplets size={25} fill="currentColor" />
              </span>
              <p className="mt-9 text-sm font-semibold text-muted">
                Today’s intake
              </p>
              <p className="mt-2 text-[64px] font-bold leading-none tracking-[-.065em]">
                {water.toLocaleString()}{" "}
                <span className="text-xl text-muted">ml</span>
              </p>
              <p className="mt-3 font-semibold text-cyan">
                {percentage}% of your daily target
              </p>
              <div className="mt-10 h-4 overflow-hidden rounded-full bg-white/80">
                <div
                  style={{ width: `${percentage}%` }}
                  className="h-full rounded-full bg-cyan transition-all"
                />
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {[250, 500].map((amount) => (
                  <PillButton
                    key={amount}
                    disabled={saving}
                    onClick={() => addWater(amount)}
                    className="bg-white text-ink shadow-sm"
                  >
                    <Plus size={15} />
                    {amount}ml
                  </PillButton>
                ))}
                <PillButton
                  disabled={saving || water === 0}
                  onClick={undoWater}
                  className="bg-white/50 text-muted"
                >
                  Undo
                </PillButton>
              </div>
            </div>
          </Card>
          <Card className="p-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted">This week</p>
                <p className="mt-1 text-2xl font-bold">
                  {(average / 1000).toFixed(1)} L avg.
                </p>
              </div>
              <span className="rounded-full bg-[#eaf8ff] px-3 py-1 text-xs font-bold text-cyan">
                7-day view
              </span>
            </div>
            <div className="mt-7 h-52">
              <ResponsiveContainer>
                <BarChart
                  data={history.map((item) => ({
                    day: new Date(`${item.date}T00:00:00`).toLocaleDateString(
                      undefined,
                      { weekday: "narrow" },
                    ),
                    value: item.value,
                  }))}
                >
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#888" }}
                  />
                  <YAxis hide domain={[0, 3000]} />
                  <Bar dataKey="value" fill="#28a8d8" radius={[8, 8, 8, 8]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export function SleepPage() {
  const [quality, setQuality] = useState(4);
  const [logged, setLogged] = useState(false);
  const sleepData = [
    { day: "Mon", hours: 7.2 },
    { day: "Tue", hours: 6.8 },
    { day: "Wed", hours: 7.6 },
    { day: "Thu", hours: 7.1 },
    { day: "Fri", hours: 8.0 },
    { day: "Sat", hours: 7.8 },
    { day: "Sun", hours: 7.5 },
  ];
  return (
    <div>
      <PageHeader
        eyebrow="Recovery"
        title="Sleep"
        description="See how better nights shape stronger days."
        action={
          <PillButton
            onClick={() => setLogged(true)}
            className="bg-ink text-white"
          >
            <MoonStar size={16} />
            Log sleep
          </PillButton>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
        <Card className="p-7">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-muted">Weekly sleep</p>
              <p className="mt-2 text-[38px] font-bold tracking-[-.05em]">
                7h 26m <span className="text-base text-muted">average</span>
              </p>
            </div>
            <span className="text-xs font-bold text-[#2ba75c]">
              +22m vs last week
            </span>
          </div>
          <div className="mt-7 h-64">
            <ResponsiveContainer>
              <BarChart data={sleepData}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 9]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="hours" fill="#765bd6" radius={[9, 9, 9, 9]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="bg-[#f1efff] p-7 shadow-none">
          <MoonStar className="text-[#765bd6]" fill="currentColor" />
          <p className="mt-8 text-sm font-semibold text-muted">Last night</p>
          <p className="mt-1 text-[42px] font-bold tracking-[-.05em]">7h 32m</p>
          <p className="mt-2 text-sm text-muted">11:08 pm – 6:40 am</p>
          <div className="mt-8">
            <p className="mb-3 text-xs font-bold text-muted">QUALITY</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  onClick={() => setQuality(i)}
                  className={`h-9 flex-1 rounded-xl transition ${i <= quality ? "bg-[#765bd6]" : "bg-white/70"}`}
                />
              ))}
            </div>
            <p className="mt-3 text-sm font-bold text-[#765bd6]">
              {["", "Poor", "Fair", "Good", "Very good", "Excellent"][quality]}
            </p>
          </div>
        </Card>
      </div>
      {logged && (
        <Modal title="Sleep logged" onClose={() => setLogged(false)}>
          <div className="py-8 text-center">
            <Check className="mx-auto mb-4 text-[#2ba75c]" size={36} />
            <p className="font-bold">7h 32m added to your recovery trend.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function BodyPage() {
  const [measurement, setMeasurement] = useState(false);
  const metrics = [
    ["Weight", "72.4 kg", "−1.6 kg"],
    ["Body fat", "17.8%", "−0.9%"],
    ["Waist", "81.2 cm", "−2.1 cm"],
    ["Chest", "101.4 cm", "+0.6 cm"],
    ["Arms", "36.8 cm", "+0.4 cm"],
    ["Thighs", "58.1 cm", "+0.3 cm"],
  ];
  return (
    <div>
      <PageHeader
        eyebrow="Measurements"
        title="Body"
        description="Track meaningful change beyond the scale."
        action={
          <PillButton
            onClick={() => setMeasurement(true)}
            className="bg-ink text-white"
          >
            <Plus size={16} />
            Add measurement
          </PillButton>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([label, value, change], i) => (
          <Card key={label} className="p-6">
            <span
              className={`grid size-11 place-items-center rounded-2xl ${i === 0 ? "bg-[#eeeaff] text-violet" : "bg-[#f4f4f1] text-ink"}`}
            >
              {i === 0 ? <Scale size={19} /> : <CircleGauge size={19} />}
            </span>
            <p className="mt-7 text-sm font-semibold text-muted">{label}</p>
            <p className="mt-1 text-[32px] font-bold tracking-[-.04em]">
              {value}
            </p>
            <p
              className={`mt-2 text-xs font-bold ${change.startsWith("+") && i > 2 ? "text-[#2ba75c]" : "text-violet"}`}
            >
              {change} this month
            </p>
          </Card>
        ))}
      </div>
      <Card className="mt-4 p-7">
        <h2 className="text-xl font-bold">Weight trend</h2>
        <div className="mt-6 h-64">
          <ResponsiveContainer>
            <AreaChart data={weightData}>
              <defs>
                <linearGradient id="bodyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#7357ff" stopOpacity={0.2} />
                  <stop offset="1" stopColor="#7357ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" axisLine={false} tickLine={false} />
              <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                dataKey="weight"
                stroke="#7357ff"
                strokeWidth={3}
                fill="url(#bodyGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      {measurement && (
        <Modal title="Add measurement" onClose={() => setMeasurement(false)}>
          <div className="grid grid-cols-2 gap-4">
            {["Weight (kg)", "Body fat (%)", "Waist (cm)", "Chest (cm)"].map(
              (label) => (
                <FormField key={label} label={label}>
                  <input
                    className={inputClass}
                    type="number"
                    placeholder="0.0"
                  />
                </FormField>
              ),
            )}
          </div>
          <PillButton
            onClick={() => setMeasurement(false)}
            className="mt-6 w-full bg-ink text-white"
          >
            Save measurements
          </PillButton>
        </Modal>
      )}
    </div>
  );
}

export function ProgressPage() {
  const [metric, setMetric] = useState("Training");
  const data = [
    { week: "W1", volume: 12400, calories: 2150, weight: 74 },
    { week: "W2", volume: 13900, calories: 2080, weight: 73.7 },
    { week: "W3", volume: 14800, calories: 2210, weight: 73.2 },
    { week: "W4", volume: 16200, calories: 2180, weight: 72.9 },
    { week: "W5", volume: 18420, calories: 2140, weight: 72.4 },
  ];
  return (
    <div>
      <PageHeader
        eyebrow="Trends"
        title="Progress"
        description="Zoom out and see the work paying off."
        action={
          <PillButton
            onClick={() => {
              const csv =
                "week,training_volume,calories,weight\n" +
                data.map((row) => Object.values(row).join(",")).join("\n");
              const link = document.createElement("a");
              link.href = URL.createObjectURL(
                new Blob([csv], { type: "text/csv" }),
              );
              link.download = "circle-health-progress.csv";
              link.click();
            }}
            className="bg-white text-ink shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </PillButton>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Workouts", "18", "+3"],
          ["Training volume", "18,420 kg", "+12%"],
          ["Goal adherence", "92%", "+6%"],
        ].map(([label, value, change]) => (
          <Card key={label} className="p-6">
            <p className="text-sm font-semibold text-muted">{label}</p>
            <p className="mt-3 text-[34px] font-bold tracking-[-.04em]">
              {value}
            </p>
            <p className="mt-2 text-xs font-bold text-[#2ba75c]">
              {change} this month
            </p>
          </Card>
        ))}
      </div>
      <Card className="mt-4 p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-muted">Training volume</p>
            <h2 className="mt-1 text-2xl font-bold">Five-week momentum</h2>
          </div>
          <SegmentedControl
            options={["Training", "Nutrition", "Body"]}
            value={metric}
            onChange={setMetric}
          />
        </div>
        <div className="mt-7 h-72">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis dataKey="week" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                dataKey="volume"
                stroke="#7357ff"
                strokeWidth={4}
                dot={{ r: 5, fill: "#7357ff", strokeWidth: 3, stroke: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

const mealPlan = [
  {
    day: "Monday",
    breakfast: "Berry protein oats",
    lunch: "Chicken quinoa bowl",
    dinner: "Miso salmon & rice",
  },
  {
    day: "Tuesday",
    breakfast: "Eggs & sourdough",
    lunch: "Turkey pesto wrap",
    dinner: "Beef soba stir-fry",
  },
  {
    day: "Wednesday",
    breakfast: "Greek yoghurt parfait",
    lunch: "Tuna grain salad",
    dinner: "Chicken fajita bowl",
  },
  {
    day: "Thursday",
    breakfast: "Banana protein pancakes",
    lunch: "Mediterranean couscous",
    dinner: "Garlic prawn pasta",
  },
  {
    day: "Friday",
    breakfast: "Avocado eggs toast",
    lunch: "Teriyaki chicken bowl",
    dinner: "Homemade lean burgers",
  },
  {
    day: "Saturday",
    breakfast: "Breakfast burrito",
    lunch: "Salmon poke bowl",
    dinner: "Thai basil beef",
  },
  {
    day: "Sunday",
    breakfast: "Bircher muesli",
    lunch: "Roast veggie wrap",
    dinner: "Lemon herb chicken",
  },
];

export function PlansPage() {
  const [tab, setTab] = useState("Meal plan");
  const [checked, setChecked] = useState<string[]>([
    "Greek yoghurt",
    "Chicken breast",
  ]);
  const setGenerated = (_ready: boolean) => setTab("Meal plan");
  const grocery = [
    "Greek yoghurt",
    "Rolled oats",
    "Mixed berries",
    "Chicken breast",
    "Quinoa",
    "Salmon fillets",
    "Brown rice",
    "Eggs",
    "Sourdough",
    "Avocados",
    "Spinach",
    "Capsicum",
  ];
  return (
    <div>
      <PageHeader
        eyebrow="Planning"
        title="Plans"
        description="Turn your goals into a week you can actually follow."
        action={
          <PillButton
            onClick={() => setGenerated(true)}
            className="bg-ink text-white"
          >
            <Sparkles size={16} />
            Generate plan
          </PillButton>
        }
      />
      <div className="mb-5">
        <SegmentedControl
          options={["Meal plan", "Grocery list", "Workout plan"]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === "Meal plan" ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[110px_repeat(3,1fr)] border-b border-black/[.06] bg-[#f5f5f2] px-5 py-3 text-xs font-bold text-muted">
            <span>DAY</span>
            <span>BREAKFAST</span>
            <span>LUNCH</span>
            <span>DINNER</span>
          </div>
          {mealPlan.map((row) => (
            <div
              key={row.day}
              className="grid grid-cols-[110px_repeat(3,1fr)] border-b border-black/[.05] px-5 py-4 text-sm last:border-0"
            >
              <b>{row.day}</b>
              <span className="text-muted">{row.breakfast}</span>
              <span className="text-muted">{row.lunch}</span>
              <span className="text-muted">{row.dinner}</span>
            </div>
          ))}
        </Card>
      ) : tab === "Grocery list" ? (
        <Card className="p-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Weekly groceries</h2>
              <p className="mt-1 text-sm text-muted">
                {checked.length} of {grocery.length} collected
              </p>
            </div>
            <div className="flex gap-2">
              <PillButton
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(
                    new Blob([grocery.join("\n")], { type: "text/plain" }),
                  );
                  link.download = "circle-health-grocery-list.txt";
                  link.click();
                }}
                className="bg-[#f2f2ef] text-ink"
              >
                <Download size={15} />
                Text
              </PillButton>
              <PillButton
                onClick={() => window.print()}
                className="bg-[#f2f2ef] text-ink"
              >
                <Printer size={15} />
                Print
              </PillButton>
            </div>
          </div>
          <div className="mt-6 grid gap-2 md:grid-cols-2">
            {grocery.map((item) => (
              <button
                key={item}
                onClick={() =>
                  setChecked((c) =>
                    c.includes(item)
                      ? c.filter((x) => x !== item)
                      : [...c, item],
                  )
                }
                className={`flex items-center gap-3 rounded-2xl p-4 text-left ${checked.includes(item) ? "bg-[#edf9f0] text-muted line-through" : "bg-[#f7f7f4]"}`}
              >
                <span
                  className={`grid size-6 place-items-center rounded-full ${checked.includes(item) ? "bg-[#2ba75c] text-white" : "border border-black/15"}`}
                >
                  {checked.includes(item) && <Check size={13} />}
                </span>
                <span className="font-semibold">{item}</span>
                <span className="ml-auto text-xs no-underline">1 pack</span>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-violet">
                4-DAY STRENGTH
              </p>
              <h2 className="mt-2 text-3xl font-bold">Upper / Lower Split</h2>
              <p className="mt-3 max-w-xl text-muted">
                A balanced 8-week plan designed around progressive overload,
                60-minute sessions, and your available gym equipment.
              </p>
            </div>
            <Target size={32} className="text-violet" />
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {["Upper A", "Lower A", "Upper B", "Lower B"].map((day, i) => (
              <div key={day} className="rounded-[20px] bg-[#f5f5f2] p-5">
                <p className="text-xs font-bold text-muted">DAY {i + 1}</p>
                <p className="mt-2 font-bold">{day}</p>
                <p className="mt-1 text-xs text-muted">6 exercises · 55 min</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function InsightsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [insight, setInsight] = useState<AiInsight>({
    summary:
      "Your training rhythm is strong. Recovery and protein are the next levers.",
    wins: ["You logged consistently this week."],
    attentionAreas: ["Protein and recovery can improve."],
    recommendations: [
      "Add 20g protein to breakfast or your afternoon snack.",
      "Keep a consistent sleep window before higher-volume sessions.",
      "Add one lower-intensity recovery day.",
    ],
    disclaimer:
      "General fitness guidance only. This is not medical advice or a diagnosis.",
    generatedByAi: false,
  });
  const refresh = async () => {
    setRefreshing(true);
    try {
      setInsight(await api.getInsights());
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  return (
    <div>
      <PageHeader
        eyebrow="Circle AI"
        title="Insights"
        description="Clear, practical guidance built from your recent patterns."
        action={
          <PillButton
            onClick={refresh}
            disabled={refreshing}
            className="bg-ink text-white"
          >
            <Sparkles size={16} />
            {refreshing ? "Analysing…" : "Refresh insights"}
          </PillButton>
        }
      />
      <Card className="relative overflow-hidden border-0 bg-[#171717] p-8 text-white md:p-10">
        <div className="absolute right-0 top-0 size-80 rounded-full bg-violet/25 blur-[80px]" />
        <Brain className="relative text-[#ae9fff]" size={28} />
        <p className="relative mt-8 text-xs font-bold uppercase tracking-[.15em] text-[#ae9fff]">
          Weekly summary
        </p>
        <h2 className="relative mt-3 max-w-3xl text-[36px] font-bold leading-[1.08] tracking-[-.045em]">
          {insight.summary}
        </h2>
        <p className="relative mt-5 max-w-2xl text-base leading-7 text-white/55">
          These recommendations combine your recent training, nutrition,
          recovery, and body trends into practical next steps.
        </p>
      </Card>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Fuel recovery",
            text: "Add 20g protein to breakfast or your afternoon snack.",
            icon: Apple,
            color: "bg-[#fff1ef] text-coral",
          },
          {
            title: "Protect sleep",
            text: "Your best sessions followed nights with 7h 30m+ sleep.",
            icon: MoonStar,
            color: "bg-[#f1efff] text-[#765bd6]",
          },
          {
            title: "Keep momentum",
            text: "Schedule your next lower-body session for Thursday.",
            icon: Target,
            color: "bg-[#eaf8ff] text-cyan",
          },
        ].map(({ title, text, icon: Icon, color }, index) => (
          <Card key={title} className="p-6">
            <span
              className={`grid size-11 place-items-center rounded-2xl ${color}`}
            >
              <Icon size={19} />
            </span>
            <h3 className="mt-6 text-lg font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {insight.recommendations[index] || text}
            </p>
            <button
              onClick={() =>
                window.location.assign(
                  title === "Fuel recovery"
                    ? "/nutrition"
                    : title === "Protect sleep"
                      ? "/sleep"
                      : "/workouts",
                )
              }
              className="mt-5 flex items-center gap-1 text-sm font-bold"
            >
              Take action <ChevronRight size={15} />
            </button>
          </Card>
        ))}
      </div>
      <p className="mt-5 text-xs leading-5 text-muted">{insight.disclaimer}</p>
    </div>
  );
}

export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [settingsError, setSettingsError] = useState("");
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    age: 0,
    gender: "Male",
    height: 0,
    weight: 0,
    activityLevel: "Moderately active",
    fitnessGoal: "MAINTAIN",
  });
  const [notifications, setNotifications] = useState({
    workouts: true,
    meals: false,
    water: true,
    "weigh-in": true,
    sleep: true,
  });
  const [reminderDetails, setReminderDetails] = useState<
    Record<string, { time: string; days: string }>
  >({});
  useEffect(() => {
    api
      .getProfile()
      .then(setProfile)
      .catch((reason) =>
        setSettingsError(
          reason instanceof Error ? reason.message : "Unable to load profile",
        ),
      )
      .finally(() => setLoadingProfile(false));
    api
      .getReminders()
      .then((items) => {
        if (!items.length) return;
        setNotifications((current) => {
          const next = { ...current };
          for (const reminder of items) {
            if (reminder.type in next)
              next[reminder.type as keyof typeof next] = reminder.enabled;
          }
          return next;
        });
        setReminderDetails(
          Object.fromEntries(
            items.map((item) => [
              item.type,
              {
                time: item.reminderTime?.slice(0, 5) || "09:00",
                days: item.daysOfWeek || "EVERYDAY",
              },
            ]),
          ),
        );
      })
      .catch((reason) =>
        setSettingsError(
          reason instanceof Error ? reason.message : "Unable to load reminders",
        ),
      );
  }, []);
  const toggleReminder = async (
    key: keyof typeof notifications,
    enabled: boolean,
  ) => {
    setNotifications((current) => ({ ...current, [key]: enabled }));
    try {
      const detail = reminderDetails[key];
      await api.updateReminder(key, enabled, detail?.time, detail?.days);
    } catch (reason) {
      setNotifications((current) => ({ ...current, [key]: !enabled }));
      setSettingsError(
        reason instanceof Error ? reason.message : "Unable to update reminder",
      );
    }
  };
  const saveProfile = async () => {
    setSettingsError("");
    if (!profile.name.trim()) {
      setSettingsError("Name is required.");
      return;
    }
    if (profile.age < 13 || profile.age > 120) {
      setSettingsError("Age must be between 13 and 120.");
      return;
    }
    if (profile.height < 80 || profile.height > 250) {
      setSettingsError("Height must be between 80 and 250 cm.");
      return;
    }
    if (profile.weight < 25 || profile.weight > 500) {
      setSettingsError("Weight must be between 25 and 500 kg.");
      return;
    }
    if (!profile.dietaryProfile?.dietaryPattern) {
      setSettingsError("Choose a dietary pattern.");
      return;
    }
    if (
      profile.dietaryProfile.dietaryPattern === "CUSTOM" &&
      !profile.dietaryProfile.customDietaryPattern.trim()
    ) {
      setSettingsError("Describe your custom dietary pattern.");
      return;
    }
    setSavingProfile(true);
    try {
      await api.updateProfile({ ...profile, name: profile.name.trim() });
      setProfile(await api.getProfile());
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (reason) {
      setSettingsError(
        reason instanceof Error ? reason.message : "Unable to save profile",
      );
    } finally {
      setSavingProfile(false);
    }
  };
  const download = async () => {
    setSettingsError("");
    try {
      const csv = await api.exportProfile();
      const url = URL.createObjectURL(csv);
      const a = document.createElement("a");
      a.href = url;
      a.download = "circle-health-data.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (reason) {
      setSettingsError(
        reason instanceof Error ? reason.message : "Unable to export your data",
      );
    }
  };
  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Personalise your targets, profile, and reminders."
      />
      {settingsError && (
        <p className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">
          {settingsError}
        </p>
      )}
      {loadingProfile ? (
        <div className="h-80 animate-pulse rounded-card bg-white" />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <Card className="p-7">
              <h2 className="text-xl font-bold">Your profile</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <FormField label="Name">
                  <input
                    className={inputClass}
                    value={profile.name}
                    onChange={(event) =>
                      setProfile({ ...profile, name: event.target.value })
                    }
                  />
                </FormField>
                {[
                  ["Age", "age"],
                  ["Height (cm)", "height"],
                  ["Weight (kg)", "weight"],
                ].map(([label, key]) => (
                  <FormField key={key} label={label}>
                    <input
                      type="number"
                      min={key === "age" ? 13 : key === "height" ? 80 : 25}
                      max={key === "age" ? 120 : key === "height" ? 250 : 500}
                      step={key === "age" ? 1 : 0.1}
                      className={inputClass}
                      value={profile[key as "age" | "height" | "weight"]}
                      onChange={(event) =>
                        setProfile({
                          ...profile,
                          [key]: Number(event.target.value),
                        })
                      }
                    />
                  </FormField>
                ))}
                <FormField label="Gender">
                  <select
                    className={inputClass}
                    value={profile.gender}
                    onChange={(event) =>
                      setProfile({ ...profile, gender: event.target.value })
                    }
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </select>
                </FormField>
                <FormField label="Activity level">
                  <select
                    className={inputClass}
                    value={profile.activityLevel}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        activityLevel: event.target.value,
                      })
                    }
                  >
                    <option>Lightly active</option>
                    <option>Moderately active</option>
                    <option>Very active</option>
                  </select>
                </FormField>
                <FormField label="Fitness goal">
                  <select
                    className={inputClass}
                    value={profile.fitnessGoal}
                    onChange={(event) =>
                      setProfile({
                        ...profile,
                        fitnessGoal: event.target.value,
                      })
                    }
                  >
                    {FITNESS_GOALS.map((goal) => (
                      <option key={goal.value} value={goal.value}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <PillButton
                onClick={saveProfile}
                disabled={savingProfile}
                className="mt-6 bg-ink text-white"
              >
                {saved ? (
                  <>
                    <Check size={16} />
                    Saved
                  </>
                ) : (
                  <>{savingProfile ? "Saving…" : "Save changes"}</>
                )}
              </PillButton>
            </Card>
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-[#eeeaff] text-violet">
                    <Target size={18} />
                  </span>
                  <h2 className="font-bold">Calculated targets</h2>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    ["BMI", profile.bmi?.toFixed(1) ?? "—"],
                    ["BMR", profile.bmr ? `${profile.bmr} kcal` : "—"],
                    ["TDEE", profile.tdee ? `${profile.tdee} kcal` : "—"],
                    [
                      "Daily target",
                      profile.calorieTarget
                        ? `${profile.calorieTarget} kcal`
                        : "—",
                    ],
                    [
                      "Protein",
                      profile.proteinTarget
                        ? `${profile.proteinTarget} g`
                        : "—",
                    ],
                    [
                      "Hydration",
                      profile.hydrationTargetMl
                        ? `${profile.hydrationTargetMl} ml`
                        : "—",
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-[#f7f7f4] p-3">
                      <p className="text-[10px] font-bold uppercase text-muted">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-muted">
                  Targets use standard BMI and Mifflin–St Jeor estimates
                  adjusted for activity and goal.
                </p>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-[#fff7e9] text-amber">
                    <Bell size={18} />
                  </span>
                  <h2 className="font-bold">Reminders</h2>
                </div>
                <div className="mt-5 space-y-4">
                  {Object.entries(notifications).map(([key, value]) => (
                    <div key={key} className="rounded-2xl bg-[#f7f7f4] p-3">
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm font-semibold capitalize">
                          {key}
                        </span>
                        <button
                          onClick={() =>
                            toggleReminder(
                              key as keyof typeof notifications,
                              !value,
                            )
                          }
                          aria-label={`${value ? "Disable" : "Enable"} ${key} reminder`}
                        >
                          <span
                            className={`relative h-7 w-12 rounded-full transition ${value ? "bg-ink" : "bg-[#deded8]"}`}
                          >
                            <span
                              className={`absolute top-1 size-5 rounded-full bg-white transition ${value ? "left-6" : "left-1"}`}
                            />
                          </span>
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <input
                          aria-label={`${key} reminder time`}
                          type="time"
                          className="h-9 rounded-xl border-0 bg-white px-2 text-xs font-semibold"
                          value={reminderDetails[key]?.time || "09:00"}
                          onChange={(event) =>
                            setReminderDetails((current) => ({
                              ...current,
                              [key]: {
                                time: event.target.value,
                                days: current[key]?.days || "EVERYDAY",
                              },
                            }))
                          }
                          onBlur={(event) =>
                            api
                              .updateReminder(
                                key,
                                value,
                                event.target.value,
                                reminderDetails[key]?.days || "EVERYDAY",
                              )
                              .catch((reason) =>
                                setSettingsError(
                                  reason instanceof Error
                                    ? reason.message
                                    : "Unable to update reminder",
                                ),
                              )
                          }
                        />
                        <select
                          aria-label={`${key} reminder recurrence`}
                          className="h-9 rounded-xl border-0 bg-white px-2 text-xs font-semibold"
                          value={reminderDetails[key]?.days || "EVERYDAY"}
                          onChange={(event) => {
                            const days = event.target.value;
                            setReminderDetails((current) => ({
                              ...current,
                              [key]: {
                                time: current[key]?.time || "09:00",
                                days,
                              },
                            }));
                            api
                              .updateReminder(
                                key,
                                value,
                                reminderDetails[key]?.time || "09:00",
                                days,
                              )
                              .catch((reason) =>
                                setSettingsError(
                                  reason instanceof Error
                                    ? reason.message
                                    : "Unable to update reminder",
                                ),
                              );
                          }}
                        >
                          <option value="EVERYDAY">Every day</option>
                          <option value="WEEKDAYS">Weekdays</option>
                          <option value="MON,WED,FRI">Mon, Wed, Fri</option>
                          <option value="MON">Weekly</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-6">
                <h2 className="font-bold">Your data</h2>
                <p className="mt-2 text-sm leading-5 text-muted">
                  Download a portable copy of your profile and activity.
                </p>
                <PillButton
                  onClick={download}
                  className="mt-5 w-full bg-[#f2f2ef] text-ink"
                >
                  <Download size={15} />
                  Export as CSV
                </PillButton>
              </Card>
            </div>
          </div>
          <DietaryPreferencesEditor
            profile={profile}
            onChange={setProfile}
            onSave={saveProfile}
            saving={savingProfile}
            saved={saved}
          />
        </>
      )}
    </div>
  );
}
