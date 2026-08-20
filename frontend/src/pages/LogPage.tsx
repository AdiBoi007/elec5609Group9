import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  AlertTriangle,
  Check,
  Droplets,
  Dumbbell,
  MoonStar,
  Minus,
  Plus,
  Scale,
  Search,
  Leaf,
  Trash2,
  Utensils,
} from "lucide-react";
import { BarcodeScanner } from "../components/BarcodeScanner";
import { Link, useSearchParams } from "react-router-dom";
import {
  Card,
  FormField,
  inputClass,
  Modal,
  PageHeader,
  PillButton,
} from "../components/ui";
import { api } from "../services/api";
import type {
  ApiExercise,
  ApiMeal,
  ApiWorkout,
  BodyMeasurement,
  DashboardSummary,
  FoodLookup,
  FoodShortcut,
  SleepEntry,
  WaterSummary,
} from "../types";

type LogType = "Workout" | "Meal" | "Water" | "Sleep" | "Body";
type SelectedFood = { food: FoodLookup; quantity: number; unit: string };
type TodayState = {
  dashboard: DashboardSummary;
  meals: ApiMeal[];
  water: WaterSummary;
  workouts: ApiWorkout[];
  sleep?: SleepEntry;
  body?: BodyMeasurement;
};

const localDate = (date = new Date()) => {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 10);
};
const localTime = (date: Date) => date.toTimeString().slice(0, 5);
const freshSleep = () => {
  const wake = new Date();
  wake.setSeconds(0, 0);
  const bed = new Date(wake.getTime() - 8 * 60 * 60 * 1000);
  return {
    date: localDate(wake),
    bedtime: localTime(bed),
    wakeTime: localTime(wake),
    quality: 4,
    notes: "",
  };
};
const freshBody = (): Omit<BodyMeasurement, "id"> => ({
  measuredOn: localDate(),
  notes: "",
});
const tabs: Array<{ name: LogType; icon: typeof Dumbbell; tone: string }> = [
  { name: "Workout", icon: Dumbbell, tone: "bg-[#eeeaff] text-violet" },
  { name: "Meal", icon: Utensils, tone: "bg-[#fff1ef] text-coral" },
  { name: "Water", icon: Droplets, tone: "bg-[#eaf8ff] text-cyan" },
  { name: "Sleep", icon: MoonStar, tone: "bg-[#f1efff] text-[#765bd6]" },
  { name: "Body", icon: Scale, tone: "bg-[#f2f2ef] text-ink" },
];

export default function LogPage() {
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get("type");
  const [active, setActive] = useState<LogType>(
    tabs.some((tab) => tab.name === requestedType)
      ? (requestedType as LogType)
      : "Meal",
  );
  const [today, setToday] = useState<TodayState | null>(null);
  const [library, setLibrary] = useState<ApiExercise[]>([]);
  const [foods, setFoods] = useState<FoodLookup[]>([]);
  const [foodMode, setFoodMode] = useState<"Search" | "Recent" | "Frequent">("Search");
  const [recentFoods, setRecentFoods] = useState<FoodShortcut[]>([]);
  const [frequentFoods, setFrequentFoods] = useState<FoodShortcut[]>([]);
  const [foodQuery, setFoodQuery] = useState(searchParams.get("food") || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [scannerOpen, setScannerOpen] = useState(
    searchParams.get("scan") === "1",
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [dietSummary, setDietSummary] = useState(
    "Your saved diet preferences are applied to food checks and meal planning.",
  );

  const [workoutName, setWorkoutName] = useState("");
  const [workoutDuration, setWorkoutDuration] = useState(60);
  const [workoutNotes, setWorkoutNotes] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState<
    Array<{
      exerciseId: number;
      name: string;
      sets: number;
      reps: number;
      weightKg: number;
    }>
  >([]);
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState("Breakfast");
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [customFood, setCustomFood] = useState({
    name: "",
    servingSize: 100,
    servingUnit: "g",
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
    fibre: 0,
  });
  const [waterAmount, setWaterAmount] = useState(250);
  const [sleep, setSleep] = useState(freshSleep());
  const [body, setBody] = useState<Omit<BodyMeasurement, "id">>(() => ({
    ...freshBody(),
    ...(searchParams.get("weight") ? { weightKg: Number(searchParams.get("weight")) } : {}),
  }));

  const loadToday = async () => {
    const [dashboard, meals, water, workouts, sleepEntries, measurements] =
      await Promise.all([
        api.getDashboard(),
        api.getMeals(1),
        api.getWaterSummary(),
        api.getWorkouts(),
        api.getSleep(),
        api.getMeasurements(),
      ]);
    const day = localDate();
    setToday({
      dashboard,
      meals: meals.filter((item) => item.eatenAt.slice(0, 10) === day),
      water,
      workouts: workouts.filter((item) => item.startedAt.slice(0, 10) === day),
      sleep: sleepEntries.find((item) => item.date === day),
      body:
        measurements.find((item) => item.measuredOn === day) ?? measurements[0],
    });
  };

  useEffect(() => {
    Promise.all([
      loadToday(),
      api.getExercises().then(setLibrary),
      api.getFoods().then(setFoods),
      api
        .getProfile()
        .then((profile) =>
          setDietSummary(
            profile.dietarySummary ||
              "Your saved diet preferences are applied to food checks and meal planning.",
          ),
        ),
      api.getFoodShortcuts("recent").then(setRecentFoods),
      api.getFoodShortcuts("frequent").then(setFrequentFoods),
    ])
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load logging tools",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        api
          .getFoods(foodQuery)
          .then(setFoods)
          .catch(() => undefined),
      220,
    );
    return () => window.clearTimeout(timer);
  }, [foodQuery]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (tabs.some((tab) => tab.name === requestedType))
      setActive(requestedType as LogType);
    if (searchParams.get("scan") === "1") setScannerOpen(true);
  }, [requestedType, searchParams]);

  const succeed = async (message: string) => {
    await loadToday();
    setToast(message);
    setError("");
  };
  const run = async (action: () => Promise<void>, message: string) => {
    setSaving(true);
    setError("");
    try {
      await action();
      await succeed(message);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save this entry",
      );
    } finally {
      setSaving(false);
    }
  };
  const addWater = (amount: number) => {
    if (!Number.isInteger(amount) || amount < 1 || amount > 5000) {
      setError("Water must be between 1 and 5,000 ml.");
      return;
    }
    void run(async () => {
      await api.addWater(amount);
    }, `${amount} ml added to today’s hydration.`);
  };
  const addFood = (
    food: FoodLookup,
    quantity = food.servingSize || 100,
    unit = food.servingUnit || "g",
  ) => {
    setSelectedFoods((current) =>
      current.some((item) => item.food.id === food.id)
        ? current.map((item) =>
            item.food.id === food.id
              ? { ...item, quantity: item.quantity + quantity, unit }
              : item,
          )
        : [...current, { food, quantity, unit }],
    );
  };
  const mealTotals = useMemo(
    () =>
      selectedFoods.reduce(
        (totals, item) => {
          const multiplier = item.quantity / (item.food.servingSize || 100);
          totals.calories += (item.food.calories || 0) * multiplier;
          totals.protein += (item.food.protein || 0) * multiplier;
          totals.carbs += (item.food.carbohydrates || 0) * multiplier;
          totals.fat += (item.food.fat || 0) * multiplier;
          return totals;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [selectedFoods],
  );
  const addShortcut = (item: FoodShortcut) => addFood({
    ...item,
    brand: item.brand || "",
    measurementType: item.servingUnit.toLowerCase().includes("ml") ? "LIQUID" : item.servingUnit.toLowerCase().includes("g") ? "SOLID" : "SERVING",
    nutritionBasisQuantity: item.servingSize || 1,
    nutritionBasisUnit: item.servingUnit || "serving",
    fibre: 0,
    compatibility: { status: "UNKNOWN", metadataAvailable: false, warnings: ["Ingredient metadata is incomplete."] },
  });

  const saveWorkout = () => {
    if (!workoutName.trim() || !workoutExercises.length) {
      setError("Add a workout name and at least one exercise.");
      return;
    }
    if (
      !Number.isInteger(workoutDuration) ||
      workoutDuration < 1 ||
      workoutDuration > 1440
    ) {
      setError("Workout duration must be between 1 and 1,440 minutes.");
      return;
    }
    if (
      workoutExercises.some(
        (item) => item.sets < 1 || item.reps < 1 || item.weightKg < 0,
      )
    ) {
      setError("Sets and reps must be positive and weight cannot be negative.");
      return;
    }
    void run(async () => {
      await api.createWorkout({
        name: workoutName.trim(),
        durationMinutes: workoutDuration,
        notes: workoutNotes.trim(),
        exercises: workoutExercises.map(
          ({ exerciseId, sets, reps, weightKg }) => ({
            exerciseId,
            sets,
            reps,
            weightKg,
          }),
        ),
      });
      setWorkoutName("");
      setWorkoutDuration(60);
      setWorkoutNotes("");
      setWorkoutExercises([]);
    }, "Workout saved. Your activity totals are up to date.");
  };
  const saveMeal = () => {
    if (!selectedFoods.length) {
      setError("Add at least one food to this meal.");
      return;
    }
    if (
      selectedFoods.some(
        (item) =>
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          item.quantity > 100000,
      )
    ) {
      setError("Serving sizes must be between 1 and 100,000.");
      return;
    }
    void run(async () => {
      await api.logMeal({
        name: mealName.trim() || `${mealType} meal`,
        mealType,
        reusable: false,
        foods: selectedFoods.map((item) => ({
          foodId: item.food.id,
          quantity: item.quantity,
          unit: item.unit,
        })),
      });
      setMealName("");
      setSelectedFoods([]);
    }, "Meal logged. Today’s nutrition totals have been recalculated.");
  };
  const createCustomFood = () => {
    if (!customFood.name.trim()) {
      setError("Enter a custom food name.");
      return;
    }
    if (
      customFood.servingSize <= 0 ||
      Object.values(customFood)
        .slice(3)
        .some((value) => typeof value === "number" && value < 0)
    ) {
      setError(
        "Serving size must be positive and nutrition values cannot be negative.",
      );
      return;
    }
    void run(async () => {
      const created = await api.createFood({
        ...customFood,
        name: customFood.name.trim(),
      });
      setFoods((current) => [created, ...current]);
      addFood(created, created.servingSize);
      setCustomOpen(false);
      setCustomFood({
        name: "",
        servingSize: 100,
        servingUnit: "g",
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        fibre: 0,
      });
    }, "Custom food created and added to this meal.");
  };
  const saveSleep = () => {
    const end = new Date(`${sleep.date}T${sleep.wakeTime}:00`);
    const start = new Date(`${sleep.date}T${sleep.bedtime}:00`);
    if (start >= end) start.setDate(start.getDate() - 1);
    const minutes = (end.getTime() - start.getTime()) / 60000;
    if (
      !sleep.date ||
      !sleep.bedtime ||
      !sleep.wakeTime ||
      minutes <= 0 ||
      minutes > 1440
    ) {
      setError(
        "Choose valid sleep and wake times no more than 24 hours apart.",
      );
      return;
    }
    if (end.getTime() > Date.now()) {
      setError("Wake time cannot be in the future.");
      return;
    }
    void run(async () => {
      await api.createSleep({
        startedAt: `${localDate(start)}T${localTime(start)}:00`,
        endedAt: `${localDate(end)}T${localTime(end)}:00`,
        quality: sleep.quality,
        notes: sleep.notes.trim(),
      });
      setSleep(freshSleep());
    }, "Sleep entry saved. Recovery insights are updated.");
  };
  const saveBody = () => {
    const values = [
      body.weightKg,
      body.bodyFatPercentage,
      body.chestCm,
      body.waistCm,
      body.hipsCm,
      body.armsCm,
      body.thighsCm,
    ].filter((value): value is number => value != null);
    if (!values.length) {
      setError("Enter at least one body measurement.");
      return;
    }
    if (body.measuredOn > localDate()) {
      setError("Measurement date cannot be in the future.");
      return;
    }
    if (body.weightKg != null && (body.weightKg < 20 || body.weightKg > 500)) {
      setError("Weight must be between 20 and 500 kg.");
      return;
    }
    if (
      body.bodyFatPercentage != null &&
      (body.bodyFatPercentage < 1 || body.bodyFatPercentage > 70)
    ) {
      setError("Body fat must be between 1% and 70%.");
      return;
    }
    if (values.some((value) => value <= 0)) {
      setError("Measurements must be positive values.");
      return;
    }
    void run(async () => {
      await api.createMeasurement(body);
      setBody(freshBody());
    }, "Body measurement saved to your trend history.");
  };

  const nutrition = today?.meals.reduce(
    (sum, meal) => ({
      calories: sum.calories + meal.calories,
      protein: sum.protein + meal.protein,
    }),
    { calories: 0, protein: 0 },
  );
  return (
    <div>
      <PageHeader
        eyebrow="Today"
        title="Log Health Data"
        description="Everything you need to record today, in one place."
      />
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-40 flex max-w-sm items-center gap-3 rounded-[22px] bg-ink px-5 py-4 text-sm font-semibold text-white shadow-2xl"
        >
          <span className="grid size-7 place-items-center rounded-full bg-[#2ba75c]">
            <Check size={15} />
          </span>
          {toast}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-[20px] bg-[#fff1ef] p-4 text-sm font-semibold text-coral"
        >
          {error}
        </div>
      )}

      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.12em] text-muted">
              Quick log
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-.03em]">
              Record the essentials
            </h2>
          </div>
          <p className="text-sm text-muted">
            One tap for water. One place for everything else.
          </p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {[250, 500].map((amount) => (
            <button
              disabled={saving}
              key={amount}
              onClick={() => addWater(amount)}
              className="rounded-2xl bg-[#eaf8ff] p-3 text-left transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Droplets size={17} className="text-cyan" />
              <span className="mt-3 block text-xs font-bold">
                +{amount} ml Water
              </span>
            </button>
          ))}
          {(
            [
              ["Log Meal", "Meal", Utensils, "bg-[#fff1ef] text-coral"],
              ["Log Workout", "Workout", Dumbbell, "bg-[#eeeaff] text-violet"],
              ["Log Sleep", "Sleep", MoonStar, "bg-[#f1efff] text-[#765bd6]"],
              ["Log Weight", "Body", Scale, "bg-[#f2f2ef] text-ink"],
            ] as const
          ).map(([label, type, Icon, tone]) => (
            <button
              key={label}
              onClick={() => {
                setActive(type);
                setError("");
                document
                  .getElementById("log-form")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`${tone} rounded-2xl p-3 text-left transition hover:-translate-y-0.5`}
            >
              <Icon size={17} />
              <span className="mt-3 block text-xs font-bold">{label}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)]">
        <Card className="overflow-hidden">
          <div
            id="log-form"
            className="scroll-mt-24 border-b border-black/[.05] p-3 md:p-4"
          >
            <div className="grid grid-cols-5 gap-1 rounded-[22px] bg-[#f5f5f2] p-1.5">
              {tabs.map(({ name, icon: Icon, tone }) => (
                <button
                  key={name}
                  onClick={() => {
                    setActive(name);
                    setError("");
                  }}
                  className={`flex min-w-0 flex-col items-center gap-1.5 rounded-[17px] px-1 py-3 text-[11px] font-bold transition sm:flex-row sm:justify-center sm:text-sm ${active === name ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                >
                  <span
                    className={`grid size-7 place-items-center rounded-xl ${tone}`}
                  >
                    <Icon size={14} />
                  </span>
                  <span className="truncate">{name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="p-5 md:p-6">
            {active === "Workout" && (
              <section>
                <SectionTitle
                  title="Log a workout"
                  detail="Add each exercise performed in this session."
                />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <FormField label="Workout name">
                    <input
                      autoFocus
                      className={inputClass}
                      value={workoutName}
                      onChange={(e) => setWorkoutName(e.target.value)}
                      placeholder="e.g. Push Day"
                      maxLength={150}
                    />
                  </FormField>
                  <FormField label="Duration (minutes)">
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      className={inputClass}
                      value={workoutDuration}
                      onChange={(e) =>
                        setWorkoutDuration(Number(e.target.value))
                      }
                    />
                  </FormField>
                </div>
                <FormField label="Notes (optional)">
                  <textarea
                    className={`${inputClass} mt-4 h-24 py-3`}
                    value={workoutNotes}
                    onChange={(e) => setWorkoutNotes(e.target.value)}
                    maxLength={2000}
                    placeholder="Session notes, energy, or personal bests"
                  />
                </FormField>
                <div className="mt-7 flex items-center justify-between">
                  <h3 className="font-bold">Exercises</h3>
                  <PillButton
                    disabled={!library.length}
                    onClick={() => {
                      const next =
                        library.find(
                          (item) =>
                            !workoutExercises.some(
                              (current) => current.exerciseId === item.id,
                            ),
                        ) ?? library[0];
                      if (next)
                        setWorkoutExercises((current) => [
                          ...current,
                          {
                            exerciseId: next.id,
                            name: next.name,
                            sets: 3,
                            reps: 10,
                            weightKg: 0,
                          },
                        ]);
                    }}
                    className="bg-[#f1f1ee] text-ink"
                  >
                    <Plus size={15} />
                    Add exercise
                  </PillButton>
                </div>
                <div className="mt-3 space-y-3">
                  {workoutExercises.map((item, index) => (
                    <div
                      key={`${item.exerciseId}-${index}`}
                      className="rounded-[20px] bg-[#f7f7f4] p-4"
                    >
                      <div className="flex gap-3">
                        <select
                          className="min-w-0 flex-1 bg-transparent font-bold outline-none"
                          value={item.exerciseId}
                          onChange={(e) => {
                            const selected = library.find(
                              (value) => value.id === Number(e.target.value),
                            );
                            if (selected)
                              setWorkoutExercises((current) =>
                                current.map((value, i) =>
                                  i === index
                                    ? {
                                        ...value,
                                        exerciseId: selected.id,
                                        name: selected.name,
                                      }
                                    : value,
                                ),
                              );
                          }}
                        >
                          {library.map((exercise) => (
                            <option key={exercise.id} value={exercise.id}>
                              {exercise.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() =>
                            setWorkoutExercises((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                          aria-label={`Remove ${item.name}`}
                          className="text-muted hover:text-coral"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {(
                          [
                            ["Sets", "sets", 1, 100, 1],
                            ["Reps", "reps", 1, 1000, 1],
                            ["Weight", "weightKg", 0, 1000, 0.5],
                          ] as const
                        ).map(([label, key, min, max, step]) => (
                          <label
                            key={key}
                            className="rounded-xl bg-white px-3 py-2"
                          >
                            <span className="text-[9px] font-bold uppercase text-muted">
                              {label}
                            </span>
                            <input
                              type="number"
                              min={min}
                              max={max}
                              step={step}
                              value={item[key]}
                              onChange={(e) =>
                                setWorkoutExercises((current) =>
                                  current.map((value, i) =>
                                    i === index
                                      ? {
                                          ...value,
                                          [key]: Number(e.target.value),
                                        }
                                      : value,
                                  ),
                                )
                              }
                              className="w-full bg-transparent text-sm font-bold outline-none"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!workoutExercises.length && (
                    <EmptyInline
                      icon={Dumbbell}
                      text="Add your first exercise to build this workout."
                    />
                  )}
                </div>
                <PillButton
                  disabled={saving}
                  onClick={saveWorkout}
                  className="mt-7 w-full bg-ink text-white"
                >
                  {saving ? "Saving…" : "Save workout"}
                </PillButton>
              </section>
            )}

            {active === "Meal" && (
              <section>
                <SectionTitle
                  title="Log a meal"
                  detail="Build the meal on the left; totals update instantly on the right."
                />
                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.85fr)]">
                  <div className="min-w-0">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Meal name (optional)">
                        <input
                          className={inputClass}
                          value={mealName}
                          onChange={(e) => setMealName(e.target.value)}
                          placeholder={`${mealType} meal`}
                          maxLength={150}
                        />
                      </FormField>
                      <FormField label="Meal type">
                        <select
                          className={inputClass}
                          value={mealType}
                          onChange={(e) => setMealType(e.target.value)}
                        >
                          {["Breakfast", "Lunch", "Dinner", "Snack"].map(
                            (value) => (
                              <option key={value}>{value}</option>
                            ),
                          )}
                        </select>
                      </FormField>
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#edf9f0] px-3 py-2.5 text-[#31543c]">
                      <Leaf size={15} className="shrink-0 text-success" />
                      <p className="min-w-0 flex-1 truncate text-[11px]">
                        {dietSummary}
                      </p>
                      <Link
                        to="/settings"
                        className="shrink-0 text-[10px] font-bold text-success"
                      >
                        Edit
                      </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <PillButton
                        onClick={() => setCustomOpen(true)}
                        className="min-h-10 bg-[#f1f1ee] text-ink"
                      >
                        <Plus size={14} />
                        Custom food
                      </PillButton>
                      <PillButton
                        onClick={() => setScannerOpen(true)}
                        className="min-h-10 bg-ink text-white"
                      >
                        <Camera size={14} />
                        Scan barcode
                      </PillButton>
                      <PillButton onClick={() => void run(async()=>{await api.repeatLastMeal(mealType);},`Last ${mealType.toLowerCase()} repeated.`)} className="min-h-10 bg-surface-muted text-ink">Repeat last {mealType.toLowerCase()}</PillButton>
                    </div>
                    <div className="mt-4 flex gap-1 rounded-full bg-surface-muted p-1">{(["Search","Recent","Frequent"] as const).map(mode=><button key={mode} type="button" onClick={()=>setFoodMode(mode)} className={`flex-1 rounded-full px-3 py-2 text-xs font-bold ${foodMode===mode?"bg-surface text-ink shadow-sm":"text-muted"}`}>{mode}</button>)}</div>
                    {foodMode === "Search" && <div className="relative mt-3">
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                        size={16}
                      />
                      <input
                        className={`${inputClass} pl-11`}
                        value={foodQuery}
                        onChange={(e) => setFoodQuery(e.target.value)}
                        placeholder="Search saved foods"
                      />
                    </div>}
                    <div className="mt-2 max-h-[360px] divide-y divide-line overflow-y-auto">
                      {foodMode !== "Search" && (foodMode === "Recent" ? recentFoods : frequentFoods).map(item => <button key={item.id} type="button" onClick={()=>addShortcut(item)} className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-surface-muted"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#fff1ef] text-coral"><Plus size={14}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.name}</span><span className="block text-[11px] text-muted">{Math.round(item.calories)} kcal · {Math.round(item.protein)}g protein{foodMode === "Frequent" ? ` · logged ${item.useCount}×` : ""}</span></span></button>)}
                      {foodMode === "Search" && <>
                      {foods.slice(0, 10).map((food) => (
                        <button
                          key={food.id}
                          onClick={() => addFood(food)}
                          className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-black/[.025]"
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#fff1ef] text-coral">
                            <Plus size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-bold">
                                {food.name}
                              </span>
                              <CompatibilityBadge
                                compatibility={food.compatibility}
                              />
                            </span>
                            <span className="block text-[11px] text-muted">
                              Per{" "}
                              {food.nutritionBasisQuantity ||
                                food.servingSize ||
                                100}{" "}
                              {food.nutritionBasisUnit ||
                                food.servingUnit ||
                                "g"}{" "}
                              · {Math.round(food.calories || 0)} kcal
                            </span>
                          </span>
                        </button>
                      ))}
                      {!foods.length && (
                        <p className="py-8 text-center text-sm text-muted">
                          No foods match. Create one or scan a barcode.
                        </p>
                      )}
                      </>}
                      {foodMode !== "Search" && !(foodMode === "Recent" ? recentFoods : frequentFoods).length && <p className="py-8 text-center text-sm text-muted">Log meals to build this list.</p>}
                    </div>
                  </div>
                  <aside className="h-fit rounded-[20px] bg-ink p-4 text-white lg:sticky lg:top-[84px]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[.12em] text-white/40">
                          Current meal
                        </p>
                        <h3 className="mt-1 font-bold">
                          {mealName.trim() || `${mealType} meal`}
                        </h3>
                      </div>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold">
                        {selectedFoods.length} food
                        {selectedFoods.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-4 border-y border-white/10 py-3">
                      {[
                        ["Calories", mealTotals.calories, "kcal"],
                        ["Protein", mealTotals.protein, "g"],
                        ["Carbs", mealTotals.carbs, "g"],
                        ["Fat", mealTotals.fat, "g"],
                      ].map(([label, value, unit]) => (
                        <div key={String(label)}>
                          <p className="text-[8px] font-bold uppercase text-white/35">
                            {label}
                          </p>
                          <p className="mt-1 text-base font-bold">
                            {Math.round(Number(value))}
                            <span className="ml-0.5 text-[9px] text-white/35">
                              {unit}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 max-h-[310px] space-y-2 overflow-y-auto">
                      {selectedFoods.map((item, index) => (
                        <div
                          key={`${item.food.id}-${index}`}
                          className="rounded-xl bg-white/[.07] p-3"
                        >
                          <div className="flex gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold">
                                {item.food.name}
                              </p>
                              <p className="mt-0.5 text-[10px] text-white/45">
                                {Math.round(
                                  ((item.food.calories || 0) * item.quantity) /
                                    (item.food.servingSize || 100),
                                )}{" "}
                                kcal ·{" "}
                                {Math.round(
                                  ((item.food.protein || 0) * item.quantity) /
                                    (item.food.servingSize || 100),
                                )}{" "}
                                P
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedFoods((current) =>
                                  current.filter((_, i) => i !== index),
                                )
                              }
                              aria-label={`Remove ${item.food.name}`}
                              className="text-white/35 hover:text-coral"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`Decrease ${item.food.name}`}
                              onClick={() =>
                                setSelectedFoods((current) =>
                                  current.map((value, i) =>
                                    i === index
                                      ? {
                                          ...value,
                                          quantity: Math.max(
                                            1,
                                            value.quantity - 10,
                                          ),
                                        }
                                      : value,
                                  ),
                                )
                              }
                              className="grid size-7 place-items-center rounded-lg bg-white/10"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              aria-label={`${item.food.name} amount`}
                              type="number"
                              min="1"
                              max="100000"
                              className="h-7 min-w-0 flex-1 rounded-lg bg-white/10 px-2 text-center text-xs font-bold outline-none"
                              value={item.quantity}
                              onChange={(e) =>
                                setSelectedFoods((current) =>
                                  current.map((value, i) =>
                                    i === index
                                      ? {
                                          ...value,
                                          quantity: Number(e.target.value),
                                        }
                                      : value,
                                  ),
                                )
                              }
                            />
                            <span className="w-7 text-[10px] text-white/45">
                              {item.unit}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase ${item.food.name}`}
                              onClick={() =>
                                setSelectedFoods((current) =>
                                  current.map((value, i) =>
                                    i === index
                                      ? {
                                          ...value,
                                          quantity: value.quantity + 10,
                                        }
                                      : value,
                                  ),
                                )
                              }
                              className="grid size-7 place-items-center rounded-lg bg-white/10"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {!selectedFoods.length && (
                        <div className="py-8 text-center">
                          <Utensils
                            className="mx-auto text-white/25"
                            size={20}
                          />
                          <p className="mt-2 text-xs text-white/45">
                            Add foods to build this meal.
                          </p>
                        </div>
                      )}
                    </div>
                    <PillButton
                      disabled={saving || !selectedFoods.length}
                      onClick={saveMeal}
                      className="mt-4 w-full bg-white text-ink"
                    >
                      {saving ? "Saving…" : "Log meal"}
                    </PillButton>
                  </aside>
                </div>
              </section>
            )}

            {active === "Water" && (
              <section>
                <SectionTitle
                  title="Log water"
                  detail="Add a common amount or enter your own."
                />
                <div className="mt-7 grid grid-cols-3 gap-3">
                  {[250, 500, 750].map((amount) => (
                    <button
                      disabled={saving}
                      key={amount}
                      onClick={() => addWater(amount)}
                      className="rounded-[22px] bg-[#eaf8ff] p-5 text-center text-cyan transition hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      <Droplets className="mx-auto" size={20} />
                      <span className="mt-3 block text-lg font-bold">
                        +{amount}
                      </span>
                      <span className="text-xs font-semibold">ml</span>
                    </button>
                  ))}
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <FormField label="Custom amount (ml)">
                    <input
                      type="number"
                      min="1"
                      max="5000"
                      className={inputClass}
                      value={waterAmount}
                      onChange={(e) => setWaterAmount(Number(e.target.value))}
                    />
                  </FormField>
                  <PillButton
                    disabled={saving}
                    onClick={() => addWater(waterAmount)}
                    className="self-end bg-ink text-white"
                  >
                    {saving ? "Adding…" : "Add water"}
                  </PillButton>
                </div>
                {today && (
                  <div className="mt-7 rounded-[22px] bg-[#eaf8ff] p-5">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-sm font-semibold text-muted">
                          Today
                        </p>
                        <p className="mt-1 text-3xl font-bold">
                          {today.water.todayMl.toLocaleString()}{" "}
                          <span className="text-sm text-muted">
                            / {today.water.targetMl.toLocaleString()} ml
                          </span>
                        </p>
                      </div>
                      <p className="font-bold text-cyan">
                        {Math.round(
                          (today.water.todayMl / today.water.targetMl) * 100,
                        )}
                        %
                      </p>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-cyan transition-all"
                        style={{
                          width: `${Math.min(100, (today.water.todayMl / today.water.targetMl) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </section>
            )}

            {active === "Sleep" && (
              <section>
                <SectionTitle
                  title="Log sleep"
                  detail="Sleep is attributed to the day you woke up."
                />
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <FormField label="Wake date">
                    <input
                      type="date"
                      max={localDate()}
                      className={inputClass}
                      value={sleep.date}
                      onChange={(e) =>
                        setSleep({ ...sleep, date: e.target.value })
                      }
                    />
                  </FormField>
                  <FormField label="Bedtime">
                    <input
                      type="time"
                      className={inputClass}
                      value={sleep.bedtime}
                      onChange={(e) =>
                        setSleep({ ...sleep, bedtime: e.target.value })
                      }
                    />
                  </FormField>
                  <FormField label="Wake time">
                    <input
                      type="time"
                      className={inputClass}
                      value={sleep.wakeTime}
                      onChange={(e) =>
                        setSleep({ ...sleep, wakeTime: e.target.value })
                      }
                    />
                  </FormField>
                </div>
                <FormField label="Sleep quality">
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        onClick={() => setSleep({ ...sleep, quality: value })}
                        className={`h-12 rounded-2xl text-sm font-bold ${value <= sleep.quality ? "bg-[#765bd6] text-white" : "bg-[#f4f4f1]"}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </FormField>
                <FormField label="Notes (optional)">
                  <textarea
                    className={`${inputClass} h-24 py-3`}
                    value={sleep.notes}
                    onChange={(e) =>
                      setSleep({ ...sleep, notes: e.target.value })
                    }
                    maxLength={1000}
                    placeholder="How did you sleep?"
                  />
                </FormField>
                <PillButton
                  disabled={saving}
                  onClick={saveSleep}
                  className="mt-6 w-full bg-ink text-white"
                >
                  {saving ? "Saving…" : "Save sleep entry"}
                </PillButton>
              </section>
            )}

            {active === "Body" && (
              <section>
                <SectionTitle
                  title="Log body measurements"
                  detail="Only enter the measurements you took today."
                />
                <FormField label="Date">
                  <input
                    type="date"
                    max={localDate()}
                    className={`${inputClass} mt-6`}
                    value={body.measuredOn}
                    onChange={(e) =>
                      setBody({ ...body, measuredOn: e.target.value })
                    }
                  />
                </FormField>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Weight (kg)", "weightKg", 20, 500],
                    ["Body fat (%)", "bodyFatPercentage", 1, 70],
                    ["Waist (cm)", "waistCm", 10, 400],
                    ["Chest (cm)", "chestCm", 10, 400],
                    ["Hips (cm)", "hipsCm", 10, 400],
                    ["Arms (cm)", "armsCm", 10, 400],
                    ["Thighs (cm)", "thighsCm", 10, 400],
                  ].map(([label, key, min, max]) => (
                    <FormField key={String(key)} label={String(label)}>
                      <input
                        type="number"
                        step="0.1"
                        min={Number(min)}
                        max={Number(max)}
                        className={inputClass}
                        value={
                          (body[key as keyof typeof body] as
                            | number
                            | undefined) ?? ""
                        }
                        onChange={(e) =>
                          setBody({
                            ...body,
                            [key]:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          })
                        }
                      />
                    </FormField>
                  ))}
                </div>
                <FormField label="Notes (optional)">
                  <textarea
                    className={`${inputClass} h-24 py-3`}
                    value={body.notes ?? ""}
                    onChange={(e) =>
                      setBody({ ...body, notes: e.target.value })
                    }
                    maxLength={1000}
                  />
                </FormField>
                <PillButton
                  disabled={saving}
                  onClick={saveBody}
                  className="mt-6 w-full bg-ink text-white"
                >
                  {saving ? "Saving…" : "Save measurements"}
                </PillButton>
              </section>
            )}
          </div>
        </Card>

        <Card className="h-fit p-6 md:p-7">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-muted">
            Today’s log
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-[-.03em]">
            Your day so far
          </h2>
          {loading || !today ? (
            <div className="mt-6 h-72 animate-pulse rounded-[20px] bg-[#f4f4f1]" />
          ) : (
            <>
              <div className="mt-6 space-y-2">
                <TodayRow
                  icon={Utensils}
                  tone="bg-[#fff1ef] text-coral"
                  label="Nutrition"
                  value={`${nutrition?.calories.toLocaleString() ?? 0} kcal`}
                  detail={`${nutrition?.protein.toLocaleString() ?? 0} g protein · ${today.meals.length} meals`}
                />
                <TodayRow
                  icon={Droplets}
                  tone="bg-[#eaf8ff] text-cyan"
                  label="Water"
                  value={`${today.water.todayMl.toLocaleString()} ml`}
                  detail={`${Math.round((today.water.todayMl / today.water.targetMl) * 100)}% of target`}
                />
                <TodayRow
                  icon={Dumbbell}
                  tone="bg-[#eeeaff] text-violet"
                  label="Workout"
                  value={
                    today.workouts.length
                      ? `${today.workouts.length} completed`
                      : "Not logged"
                  }
                  detail={
                    today.workouts.map((item) => item.name).join(", ") ||
                    "No workout is treated neutrally"
                  }
                />
                <TodayRow
                  icon={MoonStar}
                  tone="bg-[#f1efff] text-[#765bd6]"
                  label="Sleep"
                  value={
                    today.sleep
                      ? `${Math.floor(today.sleep.durationMinutes / 60)}h ${today.sleep.durationMinutes % 60}m`
                      : "Not logged"
                  }
                  detail={
                    today.sleep
                      ? `Quality ${today.sleep.quality}/5`
                      : "Add last night’s sleep"
                  }
                />
                <TodayRow
                  icon={Scale}
                  tone="bg-[#f2f2ef] text-ink"
                  label={
                    today.body?.measuredOn === localDate()
                      ? "Body"
                      : "Latest body"
                  }
                  value={
                    today.body?.weightKg
                      ? `${today.body.weightKg.toFixed(1)} kg`
                      : "Not logged"
                  }
                  detail={
                    today.body?.measuredOn
                      ? new Date(
                          `${today.body.measuredOn}T00:00:00`,
                        ).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })
                      : "Add a measurement"
                  }
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  ["Water history", "/water"],
                  ["Sleep history", "/sleep"],
                  ["Body history", "/body"],
                ].map(([label, to]) => (
                  <Link
                    key={to}
                    to={to}
                    className="rounded-full bg-[#f1f1ee] px-3 py-2 text-[11px] font-bold text-muted transition hover:text-ink"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {scannerOpen && (
        <Modal title="Scan barcode" onClose={() => setScannerOpen(false)}>
          <BarcodeScanner
            onCancel={() => setScannerOpen(false)}
            onSelected={(food, serving, unit) => {
              addFood(food, serving, unit);
              setScannerOpen(false);
              setToast(`${food.name} added to this meal.`);
            }}
          />
        </Modal>
      )}
      {customOpen && (
        <Modal title="Create custom food" onClose={() => setCustomOpen(false)}>
          <div className="space-y-4">
            <FormField label="Food name">
              <input
                autoFocus
                className={inputClass}
                value={customFood.name}
                onChange={(e) =>
                  setCustomFood({ ...customFood, name: e.target.value })
                }
                maxLength={180}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Serving size">
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={customFood.servingSize}
                  onChange={(e) =>
                    setCustomFood({
                      ...customFood,
                      servingSize: Number(e.target.value),
                    })
                  }
                />
              </FormField>
              <FormField label="Unit">
                <input
                  className={inputClass}
                  value={customFood.servingUnit}
                  onChange={(e) =>
                    setCustomFood({
                      ...customFood,
                      servingUnit: e.target.value,
                    })
                  }
                  maxLength={30}
                />
              </FormField>
              {(
                [
                  "calories",
                  "protein",
                  "carbohydrates",
                  "fat",
                  "fibre",
                ] as const
              ).map((key) => (
                <FormField
                  key={key}
                  label={key[0].toUpperCase() + key.slice(1)}
                >
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className={inputClass}
                    value={customFood[key]}
                    onChange={(e) =>
                      setCustomFood({
                        ...customFood,
                        [key]: Number(e.target.value),
                      })
                    }
                  />
                </FormField>
              ))}
            </div>
            <PillButton
              disabled={saving}
              onClick={createCustomFood}
              className="w-full bg-ink text-white"
            >
              {saving ? "Creating…" : "Create and add"}
            </PillButton>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SectionTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-[-.03em]">{title}</h2>
      <p className="mt-1 text-sm text-muted">{detail}</p>
    </div>
  );
}
function EmptyInline({
  icon: Icon,
  text,
}: {
  icon: typeof Dumbbell;
  text: string;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-black/10 p-7 text-center">
      <Icon className="mx-auto text-muted" size={21} />
      <p className="mt-3 text-sm text-muted">{text}</p>
    </div>
  );
}
function TodayRow({
  icon: Icon,
  tone,
  label,
  value,
  detail,
}: {
  icon: typeof Dumbbell;
  tone: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-[#f7f7f4] p-3.5">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-[14px] ${tone}`}
      >
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-muted">{label}</span>
        <span className="mt-0.5 block font-bold">{value}</span>
        <span className="block truncate text-[11px] text-muted">{detail}</span>
      </span>
    </div>
  );
}
function CompatibilityBadge({
  compatibility,
}: {
  compatibility?: FoodLookup["compatibility"];
}) {
  if (!compatibility || compatibility.status === "UNKNOWN")
    return (
      <span
        title="Dietary compatibility could not be fully verified"
        className="rounded-full bg-[#eeeeea] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-muted"
      >
        Not verified
      </span>
    );
  if (compatibility.status === "CONFLICT")
    return (
      <span
        title={compatibility.warnings.join(" ")}
        className="inline-flex items-center gap-1 rounded-full bg-[#fff1ef] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-coral"
      >
        <AlertTriangle size={10} />
        Preference warning
      </span>
    );
  return (
    <span className="rounded-full bg-[#e4f6e9] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#218c49]">
      Suitable
    </span>
  );
}
