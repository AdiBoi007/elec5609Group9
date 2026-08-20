import type {
  AiInsight,
  ApiExercise,
  ApiMeal,
  ApiWorkout,
  DashboardSummary,
  Reminder,
  UserProfile,
  SleepEntry,
  SleepSummary,
  BodyMeasurement,
  BodySummary,
  ProgressSummary,
  StreakSummary,
  WorkoutPlanRecord,
  MealPlanRecord,
  GroceryList,
  GroceryItem,
  AppNotification,
  FoodLookup,
  WaterSummary,
  ApiWorkoutDetail,
  CalendarMonth,
  Goal,
  GoalInput,
  PersonalRecords,
  FoodShortcut,
  ComparisonSummary,
  RecoverySummary,
  PulseAnswer,
  MealSuggestionResponse,
  FinishDayResponse,
  TodaySummary,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const request = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = localStorage.getItem("pulse_token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if ((response.status === 401 || response.status === 403) && token) {
      localStorage.removeItem("pulse_token");
      localStorage.removeItem("pulse_user");
      if (!window.location.pathname.startsWith("/login")) window.location.assign("/login");
    }
    throw new Error(body.message || "Something went wrong");
  }
  if (response.status === 204) return undefined as T;
  return response.json();
};

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; name: string; email: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string, dietaryPattern: string, customDietaryPattern?: string) =>
    request<{ token: string; name: string; email: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, dietaryPattern, customDietaryPattern }),
    }),
  getDashboard: () => request<DashboardSummary>("/dashboard"),
  getToday: () => request<TodaySummary>("/today"),
  addWater: (amountMl: number) =>
    request<{ id: number; message: string }>("/water", {
      method: "POST",
      body: JSON.stringify({ amountMl }),
    }),
  removeLatestWater: () =>
    request<{ id: number; amountMl: number; message: string }>("/water/latest", {
      method: "DELETE",
    }),
  getWaterSummary: () => request<WaterSummary>("/water/summary"),
  getProfile: () => request<UserProfile>("/profile"),
  updateProfile: (profile: Partial<UserProfile>) =>
    request<{ message: string }>("/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),
  exportProfile: async () => {
    const token = localStorage.getItem("pulse_token");
    const response = await fetch(`${API_URL}/profile/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error("Unable to export profile");
    return response.blob();
  },
  getExercises: (query = "") =>
    request<ApiExercise[]>(`/exercises?query=${encodeURIComponent(query)}`),
  getWorkouts: () => request<ApiWorkout[]>("/workouts"),
  getPersonalRecords: () => request<PersonalRecords>("/workouts/records"),
  getWorkout: (id: number) => request<ApiWorkoutDetail>(`/workouts/${id}`),
  repeatWorkout: (id: number) => request<ApiWorkout>(`/workouts/${id}/repeat`, { method: "POST" }),
  deleteWorkout: (id: number) => request<void>(`/workouts/${id}`, { method: "DELETE" }),
  createWorkout: (workout: {
    name: string;
    durationMinutes: number;
    notes?: string;
    exercises: Array<{
      exerciseId: number;
      sets: number;
      reps: number;
      weightKg: number;
    }>;
  }) =>
    request<ApiWorkout>("/workouts", {
      method: "POST",
      body: JSON.stringify(workout),
    }),
  getInsights: () =>
    request<AiInsight>("/ai/insights", {
      method: "POST",
    }),
  askPulse: (question: string) => request<PulseAnswer>("/ai/ask", { method: "POST", body: JSON.stringify({ question }) }),
  getMealSuggestions: () => request<MealSuggestionResponse>("/ai/meal-suggestions"),
  finishDay: () => request<FinishDayResponse>("/ai/finish-day"),
  getReminders: () => request<Reminder[]>("/reminders"),
  updateReminder: (type: string, enabled: boolean, reminderTime?: string, daysOfWeek?: string) =>
    request<Reminder>(`/reminders/${encodeURIComponent(type)}`, {
      method: "PUT",
      body: JSON.stringify({ enabled, reminderTime, daysOfWeek }),
    }),
  createFood: (food: {
    name: string;
    servingSize: number;
    servingUnit: string;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fibre: number;
    sugar?: number;
    saturatedFat?: number;
  }) =>
    request<FoodLookup>("/foods", {
      method: "POST",
      body: JSON.stringify(food),
    }),
  getFoods: (query = "") => request<FoodLookup[]>(`/foods?query=${encodeURIComponent(query)}`),
  getMeals: (days = 1) => request<ApiMeal[]>(`/meals?days=${days}`),
  logMeal: (meal: {
    name: string;
    mealType: string;
    reusable: boolean;
    foods: Array<{ foodId: number; quantity: number; unit: string }>;
  }) =>
    request<ApiMeal>("/meals", {
      method: "POST",
      body: JSON.stringify(meal),
    }),
  deleteMeal: (id: number) => request<void>(`/meals/${id}`, { method: "DELETE" }),
  getFoodShortcuts: (mode: "recent" | "frequent") => request<FoodShortcut[]>(`/meals/food-shortcuts?mode=${mode}`),
  repeatMeal: (id: number) => request<ApiMeal>(`/meals/${id}/repeat`, { method: "POST" }),
  repeatLastMeal: (type?: string) => request<ApiMeal>(`/meals/repeat-last${type ? `?type=${encodeURIComponent(type)}` : ""}`, { method: "POST" }),
  getSleep: () => request<SleepEntry[]>("/sleep"),
  getSleepSummary: () => request<SleepSummary>("/sleep/summary"),
  createSleep: (entry: Omit<SleepEntry, "id" | "date" | "durationMinutes">) => request<SleepEntry>("/sleep", { method: "POST", body: JSON.stringify(entry) }),
  updateSleep: (id: number, entry: Omit<SleepEntry, "id" | "date" | "durationMinutes">) => request<SleepEntry>(`/sleep/${id}`, { method: "PUT", body: JSON.stringify(entry) }),
  deleteSleep: (id: number) => request<void>(`/sleep/${id}`, { method: "DELETE" }),
  getMeasurements: () => request<BodyMeasurement[]>("/measurements"),
  getMeasurementSummary: () => request<BodySummary>("/measurements/summary"),
  createMeasurement: (entry: Omit<BodyMeasurement, "id">) => request<BodyMeasurement>("/measurements", { method: "POST", body: JSON.stringify(entry) }),
  updateMeasurement: (id: number, entry: Omit<BodyMeasurement, "id">) => request<BodyMeasurement>(`/measurements/${id}`, { method: "PUT", body: JSON.stringify(entry) }),
  deleteMeasurement: (id: number) => request<void>(`/measurements/${id}`, { method: "DELETE" }),
  getProgress: (range: "week" | "month") => request<ProgressSummary>(`/progress?range=${range}`),
  getProgressComparison: () => request<ComparisonSummary>("/progress/compare"),
  getRecovery: () => request<RecoverySummary>("/progress/recovery"),
  getHealthCalendar: (year: number, month: number) => request<CalendarMonth>(`/progress/calendar?year=${year}&month=${month}`),
  getStreak: () => request<StreakSummary>("/streak"),
  getWorkoutPlans: () => request<WorkoutPlanRecord[]>("/plans/workouts"),
  generateWorkoutPlan: (input: { fitnessGoal: string; experienceLevel: string; daysPerWeek: number; workoutDuration: number; availableEquipment: string[]; preferences?: string }) => request<WorkoutPlanRecord>("/plans/workouts/generate", { method: "POST", body: JSON.stringify(input) }),
  deleteWorkoutPlan: (id: number) => request<void>(`/plans/workouts/${id}`, { method: "DELETE" }),
  getMealPlans: () => request<MealPlanRecord[]>("/plans/meals"),
  generateMealPlan: (input: { calorieTarget: number; proteinTarget: number; carbohydrateTarget: number; fatTarget: number; dietaryPreference: string; allergies?: string; dislikedFoods?: string; mealsPerDay: number }) => request<MealPlanRecord>("/plans/meals/generate", { method: "POST", body: JSON.stringify(input) }),
  deleteMealPlan: (id: number) => request<void>(`/plans/meals/${id}`, { method: "DELETE" }),
  getGroceryLists: () => request<GroceryList[]>("/grocery-lists"),
  generateGroceryList: (mealPlanId: number) => request<GroceryList>(`/grocery-lists/from-meal-plan/${mealPlanId}`, { method: "POST" }),
  addGroceryItem: (listId: number, item: { name: string; quantity: number; unit: string; category?: string }) => request<GroceryItem>(`/grocery-lists/${listId}/items`, { method: "POST", body: JSON.stringify(item) }),
  updateGroceryItem: (id: number, item: Partial<GroceryItem>) => request<GroceryItem>(`/grocery-items/${id}`, { method: "PUT", body: JSON.stringify(item) }),
  deleteGroceryItem: (id: number) => request<void>(`/grocery-items/${id}`, { method: "DELETE" }),
  clearCheckedGroceries: (listId: number) => request<void>(`/grocery-lists/${listId}/checked`, { method: "DELETE" }),
  lookupBarcode: (barcode: string) => request<FoodLookup>(`/foods/barcode/${encodeURIComponent(barcode)}`),
  favouriteExercise: (id: number) => request<ApiExercise>(`/exercises/${id}/favourite`, { method: "PUT" }),
  unfavouriteExercise: (id: number) => request<void>(`/exercises/${id}/favourite`, { method: "DELETE" }),
  getNotifications: () => request<{ unreadCount: number; notifications: AppNotification[] }>("/notifications"),
  readNotification: (id: number) => request<AppNotification>(`/notifications/${id}/read`, { method: "PUT" }),
  readAllNotifications: () => request<{ unreadCount: number; notifications: AppNotification[] }>("/notifications/read-all", { method: "PUT" }),
  getGoals: () => request<Goal[]>("/goals"),
  getGoal: (id: number) => request<Goal>(`/goals/${id}`),
  createGoal: (goal: GoalInput) => request<Goal>("/goals", { method: "POST", body: JSON.stringify(goal) }),
  updateGoal: (id: number, goal: GoalInput) => request<Goal>(`/goals/${id}`, { method: "PUT", body: JSON.stringify(goal) }),
  pauseGoal: (id: number) => request<Goal>(`/goals/${id}/pause`, { method: "POST" }),
  resumeGoal: (id: number) => request<Goal>(`/goals/${id}/resume`, { method: "POST" }),
  archiveGoal: (id: number) => request<Goal>(`/goals/${id}/archive`, { method: "POST" }),
  deleteGoal: (id: number) => request<void>(`/goals/${id}`, { method: "DELETE" }),
};
