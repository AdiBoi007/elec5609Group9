import type { DashboardSummary, FoodEntry, Workout } from "../types";

export const dashboardSummary: DashboardSummary = {
  calories: 1652,
  calorieTarget: 2200,
  protein: 112,
  proteinTarget: 150,
  carbs: 180,
  carbsTarget: 250,
  fat: 56,
  fatTarget: 70,
  water: 1750,
  waterTarget: 2500,
  weight: 72.4,
  streak: 7,
};

export const weeklyActivity = [
  { day: "Mon", calories: 520, workouts: 1, steps: 8200 },
  { day: "Tue", calories: 680, workouts: 1, steps: 10400 },
  { day: "Wed", calories: 410, workouts: 0, steps: 7100 },
  { day: "Thu", calories: 760, workouts: 1, steps: 11800 },
  { day: "Fri", calories: 610, workouts: 1, steps: 9300 },
  { day: "Sat", calories: 830, workouts: 1, steps: 13200 },
  { day: "Sun", calories: 470, workouts: 0, steps: 7600 },
];

export const weightData = [
  { week: "Jul 14", weight: 74.0 },
  { week: "Jul 21", weight: 73.7 },
  { week: "Jul 28", weight: 73.2 },
  { week: "Aug 4", weight: 72.9 },
  { week: "Aug 11", weight: 72.6 },
  { week: "Today", weight: 72.4 },
];

export const workouts: Workout[] = [
  {
    id: 1,
    name: "Push Day",
    focus: "Chest · Shoulders · Triceps",
    duration: "1h 15m",
    status: "Completed",
    exercises: 7,
    date: "Today, 7:10 am",
  },
  {
    id: 2,
    name: "Cardio",
    focus: "HIIT Intervals",
    duration: "25 min",
    status: "Planned",
    exercises: 5,
    date: "Today, 5:30 pm",
  },
  {
    id: 3,
    name: "Pull Day",
    focus: "Back · Biceps",
    duration: "58 min",
    status: "Completed",
    exercises: 6,
    date: "Yesterday",
  },
  {
    id: 4,
    name: "Lower Body",
    focus: "Quads · Hamstrings · Glutes",
    duration: "1h 08m",
    status: "Completed",
    exercises: 6,
    date: "Mon, 6:45 am",
  },
];

export const foodEntries: FoodEntry[] = [
  {
    id: 1,
    name: "Greek yoghurt bowl",
    meal: "Breakfast",
    serving: "1 bowl",
    calories: 410,
    protein: 28,
    carbs: 52,
    fat: 10,
  },
  {
    id: 2,
    name: "Chicken grain bowl",
    meal: "Lunch",
    serving: "420 g",
    calories: 635,
    protein: 48,
    carbs: 66,
    fat: 20,
  },
  {
    id: 3,
    name: "Banana & whey shake",
    meal: "Snack",
    serving: "1 shake",
    calories: 282,
    protein: 27,
    carbs: 34,
    fat: 4,
  },
  {
    id: 4,
    name: "Salmon, rice & greens",
    meal: "Dinner",
    serving: "1 plate",
    calories: 325,
    protein: 9,
    carbs: 28,
    fat: 22,
  },
];
