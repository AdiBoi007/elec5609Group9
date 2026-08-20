import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Download,
  Dumbbell,
  Plus,
  Printer,
  Sparkles,
  Target,
  Trash2,
  Utensils,
} from "lucide-react";
import {
  Card,
  FormField,
  inputClass,
  Modal,
  PageHeader,
  PillButton,
  SegmentedControl,
} from "../components/ui";
import { api } from "../services/api";
import type {
  GroceryItem,
  GroceryList,
  MealPlanRecord,
  WorkoutPlanRecord,
} from "../types";

export default function PlansPage() {
  const [expandedDay, setExpandedDay] = useState("");
  const [tab, setTab] = useState("Meal plans");
  const [mealPlans, setMealPlans] = useState<MealPlanRecord[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlanRecord[]>([]);
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<number>();
  const [selectedWorkout, setSelectedWorkout] = useState<number>();
  const [selectedGrocery, setSelectedGrocery] = useState<number>();
  const [generator, setGenerator] = useState<"meal" | "workout" | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 1,
    unit: "pack",
  });
  const [dietSummary, setDietSummary] = useState(
    "Your saved nutrition preferences will be applied automatically.",
  );
  const [mealForm, setMealForm] = useState({
    calorieTarget: 2200,
    proteinTarget: 150,
    carbohydrateTarget: 250,
    fatTarget: 70,
    dietaryPreference: "Balanced high protein",
    allergies: "None",
    dislikedFoods: "",
    mealsPerDay: 4,
  });
  const [workoutForm, setWorkoutForm] = useState({
    fitnessGoal: "Muscle Gain",
    experienceLevel: "Intermediate",
    daysPerWeek: 4,
    workoutDuration: 60,
    availableEquipment: ["Barbell", "Dumbbells", "Cable", "Machine"],
    preferences: "Balanced upper/lower split",
  });
  const load = async () => {
    setError("");
    try {
      const [meals, workouts, groceries, profile] = await Promise.all([
        api.getMealPlans(),
        api.getWorkoutPlans(),
        api.getGroceryLists(),
        api.getProfile(),
      ]);
      setMealPlans(meals);
      setWorkoutPlans(workouts);
      setGroceryLists(groceries);
      setSelectedMeal((current) => current ?? meals[0]?.id);
      setSelectedWorkout((current) => current ?? workouts[0]?.id);
      setSelectedGrocery((current) => current ?? groceries[0]?.id);
      setDietSummary(
        profile.dietarySummary ||
          "Your saved nutrition preferences will be applied automatically.",
      );
      const diet = profile.dietaryProfile;
      setMealForm((current) => ({
        ...current,
        calorieTarget: profile.calorieTarget ?? current.calorieTarget,
        proteinTarget: profile.proteinTarget ?? current.proteinTarget,
        carbohydrateTarget: profile.carbTarget ?? current.carbohydrateTarget,
        fatTarget: profile.fatTarget ?? current.fatTarget,
        dietaryPreference:
          diet?.dietaryPattern ||
          profile.dietaryPreferences ||
          current.dietaryPreference,
        allergies: diet
          ? [
              ...diet.allergies,
              ...diet.customAllergies,
              ...diet.restrictions,
              ...diet.customExclusions,
            ].join(", ")
          : current.allergies,
        dislikedFoods:
          diet?.dislikedFoods.join(", ") ||
          profile.dislikedIngredients ||
          current.dislikedFoods,
        mealsPerDay: diet?.preferredMealsPerDay ?? current.mealsPerDay,
      }));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load plans",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const activeMeal =
    mealPlans.find((p) => p.id === selectedMeal) ?? mealPlans[0];
  const activeWorkout =
    workoutPlans.find((p) => p.id === selectedWorkout) ?? workoutPlans[0];
  const activeGrocery =
    groceryLists.find((p) => p.id === selectedGrocery) ?? groceryLists[0];
  const generateMeal = async () => {
    setError("");
    if (
      mealForm.calorieTarget < 1000 ||
      mealForm.calorieTarget > 6000 ||
      mealForm.proteinTarget < 40 ||
      mealForm.proteinTarget > 400 ||
      mealForm.carbohydrateTarget < 50 ||
      mealForm.carbohydrateTarget > 800 ||
      mealForm.fatTarget < 20 ||
      mealForm.fatTarget > 250 ||
      !mealForm.dietaryPreference.trim()
    ) {
      setError("Enter realistic nutrition targets and a dietary preference.");
      return;
    }
    setSaving(true);
    try {
      const plan = await api.generateMealPlan(mealForm);
      setMealPlans((current) => [plan, ...current]);
      setSelectedMeal(plan.id);
      setGenerator(null);
      setTab("Meal plans");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to generate meal plan",
      );
    } finally {
      setSaving(false);
    }
  };
  const generateWorkout = async () => {
    setError("");
    if (
      !workoutForm.fitnessGoal.trim() ||
      workoutForm.daysPerWeek < 1 ||
      workoutForm.daysPerWeek > 7 ||
      workoutForm.workoutDuration < 15 ||
      workoutForm.workoutDuration > 180 ||
      !workoutForm.availableEquipment.length
    ) {
      setError(
        "Choose a goal, 1–7 training days, a 15–180 minute duration, and at least one equipment option.",
      );
      return;
    }
    setSaving(true);
    try {
      const plan = await api.generateWorkoutPlan(workoutForm);
      setWorkoutPlans((current) => [plan, ...current]);
      setSelectedWorkout(plan.id);
      setGenerator(null);
      setTab("Workout plans");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to generate workout plan",
      );
    } finally {
      setSaving(false);
    }
  };
  const deleteMeal = async (id: number) => {
    if (
      !window.confirm(
        "Delete this saved meal plan and any grocery list generated from it?",
      )
    )
      return;
    setError("");
    try {
      await api.deleteMealPlan(id);
      const next = mealPlans.filter((p) => p.id !== id);
      setMealPlans(next);
      setSelectedMeal(next[0]?.id);
      setGroceryLists((lists) =>
        lists.filter((list) => list.mealPlanId !== id),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to delete meal plan",
      );
    }
  };
  const deleteWorkout = async (id: number) => {
    if (!window.confirm("Delete this saved workout plan?")) return;
    setError("");
    try {
      await api.deleteWorkoutPlan(id);
      const next = workoutPlans.filter((p) => p.id !== id);
      setWorkoutPlans(next);
      setSelectedWorkout(next[0]?.id);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to delete workout plan",
      );
    }
  };
  const makeGrocery = async () => {
    if (!activeMeal) return;
    setSaving(true);
    setError("");
    try {
      const list = await api.generateGroceryList(activeMeal.id);
      setGroceryLists((current) => [list, ...current]);
      setSelectedGrocery(list.id);
      setTab("Grocery list");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to create grocery list",
      );
    } finally {
      setSaving(false);
    }
  };
  const updateItem = async (
    item: GroceryItem,
    changes: Partial<GroceryItem>,
  ) => {
    setError("");
    try {
      const updated = await api.updateGroceryItem(item.id, changes);
      setGroceryLists((lists) =>
        lists.map((list) => ({
          ...list,
          items: list.items.map((value) =>
            value.id === item.id ? updated : value,
          ),
        })),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to update grocery item",
      );
    }
  };
  const addItem = async () => {
    if (!activeGrocery) return;
    if (
      !newItem.name.trim() ||
      !newItem.unit.trim() ||
      !Number.isFinite(newItem.quantity) ||
      newItem.quantity <= 0
    ) {
      setError("Enter an item name, positive quantity, and unit.");
      return;
    }
    setError("");
    try {
      const item = await api.addGroceryItem(activeGrocery.id, {
        ...newItem,
        name: newItem.name.trim(),
        unit: newItem.unit.trim(),
      });
      setGroceryLists((lists) =>
        lists.map((list) =>
          list.id === activeGrocery.id
            ? { ...list, items: [...list.items, item] }
            : list,
        ),
      );
      setNewItem({ name: "", quantity: 1, unit: "pack" });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to add grocery item",
      );
    }
  };
  const removeItem = async (item: GroceryItem) => {
    if (!window.confirm(`Delete ${item.name} from this grocery list?`)) return;
    setError("");
    try {
      await api.deleteGroceryItem(item.id);
      setGroceryLists((lists) =>
        lists.map((list) => ({
          ...list,
          items: list.items.filter((value) => value.id !== item.id),
        })),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to delete grocery item",
      );
    }
  };
  const clearChecked = async () => {
    if (!activeGrocery || !window.confirm("Remove all checked items?")) return;
    setError("");
    try {
      await api.clearCheckedGroceries(activeGrocery.id);
      setGroceryLists((lists) =>
        lists.map((list) =>
          list.id === activeGrocery.id
            ? { ...list, items: list.items.filter((item) => !item.checked) }
            : list,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to clear checked items",
      );
    }
  };
  const exportGroceries = () => {
    if (!activeGrocery) return;
    const text = activeGrocery.items
      .map(
        (item) =>
          `${item.checked ? "[x]" : "[ ]"} ${item.name} — ${item.quantity} ${item.unit}`,
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "circle-health-grocery-list.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const headerAction =
    tab === "Grocery list" ? (
      <PillButton
        onClick={() => setTab("Meal plans")}
        className="bg-white text-ink shadow-sm"
      >
        <Utensils size={16} />
        View meal plans
      </PillButton>
    ) : (
      <PillButton
        onClick={() => {
          setError("");
          setGenerator(tab === "Workout plans" ? "workout" : "meal");
        }}
        className="bg-ink text-white"
      >
        <Sparkles size={16} />
        Generate {tab === "Workout plans" ? "workout" : "meal"} plan
      </PillButton>
    );
  return (
    <div>
      <PageHeader
        eyebrow="Planning"
        title="Plans"
        description="Turn your goals into a week you can actually follow."
        action={headerAction}
      />
      <div className="mb-5">
        <SegmentedControl
          options={["Meal plans", "Grocery list", "Workout plans"]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {error && (
        <p className="mb-4 rounded-2xl bg-[#fff1ef] p-4 text-sm font-semibold text-coral">
          {error}
        </p>
      )}
      {loading ? (
        <div className="h-72 animate-pulse rounded-card bg-white" />
      ) : (
        <>
          {tab === "Meal plans" &&
            (!activeMeal ? (
              <Empty
                icon={Utensils}
                title="No meal plan generated yet"
                description="Create a seven-day plan based on your nutrition targets."
                action="Generate meal plan"
                onAction={() => setGenerator("meal")}
              />
            ) : (
              <div
                className={`grid gap-4 ${mealPlans.length > 1 ? "lg:grid-cols-[220px_1fr]" : ""}`}
              >
                {mealPlans.length > 1 && (
                  <PlanList
                    title="Saved meal plans"
                    items={mealPlans.map((p) => ({
                      id: p.id,
                      name: p.name,
                      meta: `${p.calorieTarget} kcal`,
                    }))}
                    selected={activeMeal.id}
                    onSelect={setSelectedMeal}
                  />
                )}
                <Card className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/[.055] p-5 md:p-6">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.12em] text-coral">
                        {activeMeal.plan.generatedByAi
                          ? "OPENAI GENERATED"
                          : "DETERMINISTIC FALLBACK"}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold">
                        {activeMeal.name}
                      </h2>
                      <p className="mt-1 max-w-2xl text-sm leading-5 text-muted">
                        {activeMeal.plan.summary}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <PillButton
                        disabled={saving}
                        onClick={makeGrocery}
                        className="min-h-10 bg-[#f2f2ef] text-ink"
                      >
                        <Utensils size={15} />
                        Create groceries
                      </PillButton>
                      <button
                        aria-label="Delete meal plan"
                        onClick={() => deleteMeal(activeMeal.id)}
                        className="grid size-10 place-items-center rounded-full bg-[#fff1ef] text-coral"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-black/[.055] px-5 py-2">
                    {activeMeal.plan.days.map((day) => {
                      const calories = day.meals.reduce(
                        (sum, meal) => sum + meal.calories,
                        0,
                      );
                      const protein = day.meals.reduce(
                        (sum, meal) => sum + meal.protein,
                        0,
                      );
                      const open = expandedDay === day.day;
                      return (
                        <div key={day.day}>
                          <button
                            type="button"
                            onClick={() => setExpandedDay(open ? "" : day.day)}
                            className="flex w-full items-center gap-4 py-4 text-left"
                          >
                            <div className="w-24">
                              <p className="text-xs font-bold uppercase tracking-[.1em]">
                                {day.day}
                              </p>
                              <p className="mt-1 text-[10px] text-muted">
                                {day.meals.length} meals
                              </p>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold">
                                {calories.toLocaleString()} kcal ·{" "}
                                {Math.round(protein)}g protein
                              </p>
                              <p className="mt-1 truncate text-xs text-muted">
                                {day.meals.map((meal) => meal.name).join(" · ")}
                              </p>
                            </div>
                            <ChevronDown
                              size={17}
                              className={`text-muted transition ${open ? "rotate-180" : ""}`}
                            />
                          </button>
                          {open && (
                            <div className="grid gap-2 pb-4 sm:grid-cols-2">
                              {day.meals.map((meal) => (
                                <div
                                  key={meal.name}
                                  className="rounded-2xl bg-[#f7f7f4] p-3"
                                >
                                  <p className="text-sm font-bold">
                                    {meal.name}
                                  </p>
                                  <p className="mt-1 text-[11px] text-muted">
                                    {meal.calories} kcal · {meal.protein}g P ·{" "}
                                    {meal.carbohydrates}g C · {meal.fat}g F
                                  </p>
                                  <p className="mt-2 text-[10px] leading-4 text-muted">
                                    {meal.ingredients
                                      .map(
                                        (item) =>
                                          `${item.name} ${item.quantity}${item.unit}`,
                                      )
                                      .join(" · ")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            ))}
          {tab === "Workout plans" &&
            (!activeWorkout ? (
              <Empty
                icon={Dumbbell}
                title="No workout plans yet"
                description="Generate a plan based on your goals, schedule and equipment."
                action="Generate workout plan"
                onAction={() => setGenerator("workout")}
              />
            ) : (
              <div
                className={`grid gap-4 ${workoutPlans.length > 1 ? "lg:grid-cols-[220px_1fr]" : ""}`}
              >
                {workoutPlans.length > 1 && (
                  <PlanList
                    title="Saved workout plans"
                    items={workoutPlans.map((p) => ({
                      id: p.id,
                      name: p.name,
                      meta: `${p.daysPerWeek} days · ${p.goal}`,
                    }))}
                    selected={activeWorkout.id}
                    onSelect={setSelectedWorkout}
                  />
                )}
                <Card className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.12em] text-violet">
                        {activeWorkout.plan.generatedByAi
                          ? "OPENAI GENERATED"
                          : "DETERMINISTIC FALLBACK"}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold">
                        {activeWorkout.name}
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-5 text-muted">
                        {activeWorkout.plan.summary}
                      </p>
                    </div>
                    <button
                      aria-label="Delete workout plan"
                      onClick={() => deleteWorkout(activeWorkout.id)}
                      className="grid size-10 place-items-center rounded-full bg-[#fff1ef] text-coral"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-5 divide-y divide-black/[.055]">
                    {activeWorkout.plan.days.map((day) => {
                      const open = expandedDay === day.name;
                      return (
                        <div key={day.name}>
                          <button
                            type="button"
                            onClick={() => setExpandedDay(open ? "" : day.name)}
                            className="flex w-full items-center gap-4 py-4 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase text-violet">
                                {day.focus}
                              </p>
                              <h3 className="mt-1 font-bold">{day.name}</h3>
                              <p className="mt-1 text-xs text-muted">
                                {day.exercises.length} exercises ·{" "}
                                {day.exercises.reduce(
                                  (sum, exercise) => sum + exercise.sets,
                                  0,
                                )}{" "}
                                sets
                              </p>
                            </div>
                            <ChevronDown
                              size={17}
                              className={`text-muted transition ${open ? "rotate-180" : ""}`}
                            />
                          </button>
                          {open && (
                            <div className="grid gap-2 pb-4 sm:grid-cols-2">
                              {day.exercises.map((exercise) => (
                                <div
                                  key={exercise.name}
                                  className="rounded-xl bg-[#f5f5f2] p-3"
                                >
                                  <p className="text-sm font-bold">
                                    {exercise.name}
                                  </p>
                                  <p className="mt-1 text-[11px] text-muted">
                                    {exercise.sets} × {exercise.reps} ·{" "}
                                    {exercise.restSeconds}s rest
                                  </p>
                                  {exercise.notes && (
                                    <p className="mt-1 text-[10px] text-muted">
                                      {exercise.notes}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            ))}
          {tab === "Grocery list" &&
            (!activeGrocery ? (
              <Empty
                icon={Target}
                title="No grocery list yet"
                description="Open a saved meal plan and generate a consolidated list."
                action="View meal plans"
                onAction={() => setTab("Meal plans")}
              />
            ) : (
              <Card className="p-5 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">{activeGrocery.name}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {activeGrocery.items.filter((i) => i.checked).length} of{" "}
                      {activeGrocery.items.length} collected
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={activeGrocery.id}
                      onChange={(e) =>
                        setSelectedGrocery(Number(e.target.value))
                      }
                      className={`${inputClass} max-w-full sm:w-auto`}
                    >
                      {groceryLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name}
                        </option>
                      ))}
                    </select>
                    <PillButton
                      onClick={exportGroceries}
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
                    <PillButton
                      onClick={clearChecked}
                      className="bg-[#fff1ef] text-coral"
                    >
                      Clear checked
                    </PillButton>
                  </div>
                </div>
                <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_96px_112px_auto]">
                  <input
                    className={inputClass}
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                    placeholder="Add custom item"
                  />
                  <input
                    aria-label="Item quantity"
                    className={inputClass}
                    type="number"
                    min="0.1"
                    max="100000"
                    step="0.1"
                    value={newItem.quantity}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        quantity: Number(e.target.value),
                      })
                    }
                  />
                  <input
                    aria-label="Item unit"
                    className={inputClass}
                    value={newItem.unit}
                    onChange={(e) =>
                      setNewItem({ ...newItem, unit: e.target.value })
                    }
                  />
                  <PillButton onClick={addItem} className="bg-ink text-white">
                    <Plus size={15} />
                    Add
                  </PillButton>
                </div>
                <div className="mt-6 grid gap-2 md:grid-cols-2">
                  {activeGrocery.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-2xl p-4 ${item.checked ? "bg-[#edf9f0]" : "bg-[#f7f7f4]"}`}
                    >
                      <button
                        aria-label={`${item.checked ? "Uncheck" : "Check"} ${item.name}`}
                        onClick={() =>
                          updateItem(item, { checked: !item.checked })
                        }
                        className={`grid size-6 place-items-center rounded-full ${item.checked ? "bg-[#2ba75c] text-white" : "border border-black/15"}`}
                      >
                        {item.checked && <Check size={13} />}
                      </button>
                      <div
                        className={`min-w-0 flex-1 ${item.checked ? "text-muted line-through" : ""}`}
                      >
                        <p className="truncate text-sm font-semibold">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted">{item.category}</p>
                      </div>
                      <button
                        aria-label={`Edit quantity for ${item.name}`}
                        onClick={() => {
                          const value = window.prompt(
                            "Quantity",
                            String(item.quantity),
                          );
                          if (value && Number(value) > 0)
                            updateItem(item, { quantity: Number(value) });
                        }}
                        className="text-xs font-bold"
                      >
                        {item.quantity} {item.unit}
                      </button>
                      <button
                        aria-label={`Delete ${item.name}`}
                        onClick={() => removeItem(item)}
                        className="text-muted hover:text-coral"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          {generator === "meal" && (
            <Modal
              title="Generate meal plan"
              onClose={() => setGenerator(null)}
            >
              <div className="space-y-4">
                <div className="rounded-[20px] bg-[#edf9f0] p-4">
                  <p className="text-xs font-bold uppercase tracking-[.1em] text-[#218c49]">
                    Diet profile applied
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#31543c]">
                    {dietSummary}
                  </p>
                  <Link
                    to="/settings"
                    className="mt-2 inline-block text-xs font-bold text-[#218c49] underline decoration-current/30 underline-offset-4"
                  >
                    Edit in Settings
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Calories", "calorieTarget", 1000, 6000],
                    ["Protein (g)", "proteinTarget", 40, 400],
                    ["Carbs (g)", "carbohydrateTarget", 50, 800],
                    ["Fat (g)", "fatTarget", 20, 250],
                  ].map(([label, key, min, max]) => (
                    <FormField key={String(key)} label={String(label)}>
                      <input
                        type="number"
                        min={Number(min)}
                        max={Number(max)}
                        className={inputClass}
                        value={mealForm[key as keyof typeof mealForm] as number}
                        onChange={(e) =>
                          setMealForm({
                            ...mealForm,
                            [key]: Number(e.target.value),
                          })
                        }
                      />
                    </FormField>
                  ))}
                </div>
                <FormField label="Meals per day">
                  <select
                    className={inputClass}
                    value={mealForm.mealsPerDay}
                    onChange={(e) =>
                      setMealForm({
                        ...mealForm,
                        mealsPerDay: Number(e.target.value),
                      })
                    }
                  >
                    {[2, 3, 4, 5, 6].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </FormField>
                {error && (
                  <p className="text-sm font-semibold text-coral">{error}</p>
                )}
                <PillButton
                  disabled={saving}
                  onClick={generateMeal}
                  className="w-full bg-ink text-white"
                >
                  {saving ? "Building your week…" : "Generate and save plan"}
                </PillButton>
              </div>
            </Modal>
          )}
          {generator === "workout" && (
            <Modal
              title="Generate workout plan"
              onClose={() => setGenerator(null)}
            >
              <div className="space-y-4">
                <FormField label="Fitness goal">
                  <select
                    className={inputClass}
                    value={workoutForm.fitnessGoal}
                    onChange={(e) =>
                      setWorkoutForm({
                        ...workoutForm,
                        fitnessGoal: e.target.value,
                      })
                    }
                  >
                    <option>Muscle Gain</option>
                    <option>Fat Loss</option>
                    <option>General Fitness</option>
                    <option>Strength</option>
                  </select>
                </FormField>
                <FormField label="Experience">
                  <select
                    className={inputClass}
                    value={workoutForm.experienceLevel}
                    onChange={(e) =>
                      setWorkoutForm({
                        ...workoutForm,
                        experienceLevel: e.target.value,
                      })
                    }
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Days per week">
                    <input
                      type="number"
                      min="1"
                      max="7"
                      className={inputClass}
                      value={workoutForm.daysPerWeek}
                      onChange={(e) =>
                        setWorkoutForm({
                          ...workoutForm,
                          daysPerWeek: Number(e.target.value),
                        })
                      }
                    />
                  </FormField>
                  <FormField label="Minutes per session">
                    <input
                      type="number"
                      min="15"
                      max="180"
                      className={inputClass}
                      value={workoutForm.workoutDuration}
                      onChange={(e) =>
                        setWorkoutForm({
                          ...workoutForm,
                          workoutDuration: Number(e.target.value),
                        })
                      }
                    />
                  </FormField>
                </div>
                <FormField label="Equipment (comma separated)">
                  <input
                    className={inputClass}
                    value={workoutForm.availableEquipment.join(", ")}
                    onChange={(e) =>
                      setWorkoutForm({
                        ...workoutForm,
                        availableEquipment: e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </FormField>
                <FormField label="Limitations / preferences">
                  <textarea
                    className={`${inputClass} h-24 py-3`}
                    value={workoutForm.preferences}
                    onChange={(e) =>
                      setWorkoutForm({
                        ...workoutForm,
                        preferences: e.target.value,
                      })
                    }
                  />
                </FormField>
                {error && (
                  <p className="text-sm font-semibold text-coral">{error}</p>
                )}
                <PillButton
                  disabled={saving}
                  onClick={generateWorkout}
                  className="w-full bg-ink text-white"
                >
                  {saving ? "Building your plan…" : "Generate and save plan"}
                </PillButton>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}

function Empty({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: typeof Target;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <Card className="px-6 py-16 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-[20px] bg-[#f2f2ef] text-muted">
        <Icon />
      </span>
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
      <PillButton onClick={onAction} className="mt-6 bg-ink text-white">
        {action}
      </PillButton>
    </Card>
  );
}
function PlanList({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: Array<{ id: number; name: string; meta: string }>;
  selected: number;
  onSelect: (id: number) => void;
}) {
  return (
    <Card className="h-fit p-4">
      <p className="px-2 pb-3 text-xs font-bold uppercase tracking-[.1em] text-muted">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-2xl p-3 text-left ${selected === item.id ? "bg-ink text-white" : "hover:bg-[#f5f5f2]"}`}
          >
            <p className="truncate text-sm font-bold">{item.name}</p>
            <p
              className={`mt-1 text-xs ${selected === item.id ? "text-white/50" : "text-muted"}`}
            >
              {item.meta}
            </p>
          </button>
        ))}
      </div>
    </Card>
  );
}
