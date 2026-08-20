export type User = {
  id?: number;
  name: string;
  email: string;
};

export type DashboardSummary = {
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbsTarget: number;
  fat: number;
  fatTarget: number;
  water: number;
  waterTarget: number;
  weight: number;
  streak: number;
};

export type Workout = {
  id: number;
  name: string;
  focus: string;
  duration: string;
  status: "Completed" | "Planned";
  exercises: number;
  date: string;
};

export type FoodEntry = {
  id: number;
  name: string;
  meal: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type UserProfile = {
  name: string;
  email: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  activityLevel: string;
  fitnessGoal: string;
  dietaryPreferences?: string;
  dislikedIngredients?: string;
  calorieTarget?: number;
  proteinTarget?: number;
  carbTarget?: number;
  fatTarget?: number;
  hydrationTargetMl?: number;
  bmi?: number;
  bmr?: number;
  tdee?: number;
  dietarySummary?: string;
  dietaryProfile?: DietaryProfile;
};

export type DietaryProfile = {
  dietaryPattern: "OMNIVORE" | "VEGETARIAN" | "VEGAN" | "PESCATARIAN" | "EGGETARIAN" | "FLEXITARIAN" | "CUSTOM";
  customDietaryPattern: string;
  restrictions: string[];
  customExclusions: string[];
  culturalPreferences: string[];
  customCulturalPreferences: string[];
  allergies: string[];
  customAllergies: string[];
  intolerances: string[];
  customIntolerances: string[];
  favouriteFoods: string[];
  dislikedFoods: string[];
  preferredCuisines: string[];
  preferredProteinSources: string[];
  customProteinSources: string[];
  preferredMealsPerDay: number;
  mealPrepDifficulty: "VERY_EASY" | "EASY" | "MODERATE";
  mealPrepTime: "UNDER_15" | "MIN_15_30" | "MIN_30_60";
  budgetPreference: "BUDGET" | "MODERATE" | "FLEXIBLE";
};

export type ApiExercise = {
  id: number;
  name: string;
  muscleGroup: string;
  equipment: string;
  difficulty: string;
  instructions?: string;
  mediaUrl?: string;
  favourite: boolean;
};

export type ApiWorkout = {
  id: number;
  name: string;
  startedAt: string;
  durationMinutes: number;
  exerciseCount: number;
  notes?: string;
  trainingVolumeKg?: number;
  muscleGroups?: string;
};
export type PersonalRecords = { exerciseRecords: Array<{ exercise: string; highestWeightKg: number }>; highestSessionVolumeKg: number; highestVolumeSession?: string; mostWorkoutsInWeek: number; longestWorkoutStreak: number };
export type FoodShortcut = { id: number; name: string; brand?: string; servingSize: number; servingUnit: string; calories: number; protein: number; carbohydrates: number; fat: number; useCount: number; lastUsedAt: string };
export type ComparisonSummary = { label: string; metrics: Array<{ key: string; label: string; current: number; previous?: number; percentChange?: number; unit: string }> };
export type RecoverySummary = { score: number; rating: string; sleepScore: number; hydrationScore: number; trainingLoadScore: number; disclaimer: string };
export type PulseAnswer = { title: string; summary: string; evidence: string[]; actions: Array<{ label: string; to?: string; waterMl?: number }>; disclaimer: string; generatedByAi: boolean };
export type MealSuggestion = { name: string; calories: number; protein: number; carbohydrates: number; fat: number; ingredients: string };
export type MealSuggestionResponse = { remainingCalories: number; remainingProtein: number; remainingCarbohydrates: number; remainingFat: number; suggestions: MealSuggestion[]; disclaimer: string; generatedByAi: boolean };
export type FinishDayResponse = { summary: string; actions: Array<{ category: string; title: string; detail: string; to?: string }>; waterRemainingMl: number; generatedByAi: boolean };
export type TodaySummary = {
  timeline: Array<{ id: number; type: "MEAL" | "WATER" | "WORKOUT" | "SLEEP" | "BODY"; time?: string; title: string; detail: string; to: string }>;
  highlights: Array<{ type: string; title: string; detail: string; tone: "SUCCESS" | "WARNING" | "NEUTRAL" }>;
};
export type ApiWorkoutDetail = { id:number; name:string; startedAt:string; durationMinutes:number; notes?:string; exercises:Array<{id:number;exerciseId:number;name:string;sets?:number;reps?:number;weightKg?:number;durationSeconds?:number;notes?:string}> };

export type AiInsight = {
  summary: string;
  wins: string[];
  attentionAreas: string[];
  recommendations: string[];
  disclaimer: string;
  generatedByAi: boolean;
};

export type Reminder = {
  id: number;
  type: string;
  title: string;
  reminderTime: string;
  daysOfWeek?: string;
  enabled: boolean;
};

export type ApiMeal = {
  id: number;
  name: string;
  mealType: string;
  eatenAt: string;
  qualityScore: number;
  qualityRating: string;
  positives: string[];
  improvements: string[];
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  dietCompatibility: "COMPATIBLE" | "CONFLICT" | "UNKNOWN";
  dietWarnings: string[];
};

export type SleepEntry = {
  id: number;
  date: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  quality: number;
  notes?: string;
};

export type SleepSummary = {
  lastNightMinutes: number;
  averageMinutes: number;
  averageQuality: number;
  trendMinutes: number;
  history: SleepEntry[];
};
export type WaterSummary = { todayMl: number; targetMl: number; sevenDayAverage: number; history: Array<{ date: string; value: number }> };

export type BodyMeasurement = {
  id: number;
  measuredOn: string;
  weightKg?: number;
  bodyFatPercentage?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  armsCm?: number;
  thighsCm?: number;
  notes?: string;
};

export type BodySummary = {
  latestWeight?: number;
  weightChange?: number;
  latestBodyFat?: number;
  bodyFatChange?: number;
  latestWaist?: number;
  waistChange?: number;
  history: BodyMeasurement[];
};

export type StreakSummary = {
  current: number;
  longest: number;
  lastSevenDays: Array<{ date: string; active: boolean }>;
  activityDates: string[];
};

export type ProgressPoint = {
  date: string;
  workouts: number;
  durationMinutes: number;
  volumeKg: number;
  calories: number;
  protein: number;
  waterMl: number;
  sleepHours: number;
  weight?: number;
};

export type ProgressSummary = {
  range: "week" | "month";
  from: string;
  to: string;
  workouts: { count: number; totalDurationMinutes: number; trainingVolumeKg: number; workoutsPerWeek: number };
  nutrition: { averageCalories: number; averageProtein: number; calorieTargetDays: number; proteinTargetDays: number };
  hydration: { averageDailyMl: number; goalPercentage: number };
  sleep: { averageMinutes: number; averageQuality: number };
  body: { latestWeight?: number; weightChange?: number; latestBodyFat?: number; bodyFatChange?: number };
  streak: StreakSummary;
  timeline: ProgressPoint[];
};

export type WorkoutExercisePlan = { name: string; sets: number; reps: string; restSeconds: number; notes?: string };
export type WorkoutPlanRecord = {
  id: number; name: string; goal: string; daysPerWeek: number; saved: boolean; createdAt: string;
  plan: { name: string; goal: string; summary: string; days: Array<{ name: string; focus: string; exercises: WorkoutExercisePlan[] }>; disclaimer: string; generatedByAi: boolean };
};
export type Ingredient = { name: string; quantity: number; unit: string };
export type PlannedMeal = { name: string; calories: number; protein: number; carbohydrates: number; fat: number; ingredients: Ingredient[] };
export type MealPlanRecord = {
  id: number; name: string; calorieTarget: number; saved: boolean; createdAt: string;
  plan: { name: string; summary: string; days: Array<{ day: string; meals: PlannedMeal[] }>; disclaimer: string; generatedByAi: boolean };
};
export type GroceryItem = { id: number; name: string; quantity: number; unit: string; category: string; checked: boolean };
export type GroceryList = { id: number; mealPlanId: number; name: string; createdAt: string; items: GroceryItem[] };
export type AppNotification = { id: number; type: string; title: string; message: string; createdAt: string; read: boolean };
export type DietCompatibility = { status: "COMPATIBLE" | "CONFLICT" | "UNKNOWN"; metadataAvailable: boolean; warnings: string[] };
export type FoodLookup = {
  id: number; name: string; brand: string; servingSize: number; servingUnit: string;
  measurementType: "LIQUID" | "SOLID" | "SERVING" | "UNKNOWN";
  nutritionBasisQuantity: number; nutritionBasisUnit: string;
  packageQuantity?: number; packageUnit?: string;
  suggestedServingQuantity?: number; suggestedServingUnit?: string;
  calories: number; protein: number; carbohydrates: number; fat: number; fibre: number;
  sugar?: number; saturatedFat?: number; ingredientsText?: string; compatibility: DietCompatibility;
};

export type DailyStatus = "ON_TRACK" | "PARTIAL" | "OFF_TRACK" | "NO_DATA";
export type CalendarDay = {
  date: string;
  score: number;
  status: DailyStatus;
  nutrition: { status: DailyStatus; score: number; calories: number; calorieTarget: number; protein: number; proteinTarget: number; carbohydrates: number; carbohydrateTarget: number; fat: number; fatTarget: number };
  hydration: { status: DailyStatus; score: number; amountMl: number; targetMl: number };
  sleep: { status: DailyStatus; score: number; minutes: number; hours: number; quality: number };
  activity: { status: DailyStatus; score: number; workouts: number; entries: Array<{ name: string; durationMinutes: number }> };
  body?: { weight?: number; bodyFatPercentage?: number; waistCm?: number };
  wins: string[];
  attentionAreas: string[];
};
export type CalendarMonth = {
  year: number;
  month: number;
  days: CalendarDay[];
  summary: { onTrackDays: number; partialDays: number; offTrackDays: number; noDataDays: number; currentStreak: number };
};

export type GoalType = "WEIGHT" | "BODY_FAT" | "WAIST" | "PROTEIN" | "CALORIES" | "WATER" | "SLEEP" | "WORKOUT_FREQUENCY" | "STREAK";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "FAILED" | "ARCHIVED";
export type GoalDirection = "DECREASE" | "INCREASE" | "MAINTAIN" | "AT_LEAST" | "AT_MOST";
export type GoalTimelinePoint = { date: string; value: number; unit: string; progress: number; label: string; projected: boolean };
export type Goal = {
  id: number; type: GoalType; title: string; startValue?: number; currentValue?: number;
  targetValue: number; unit: string; startDate: string; targetDate?: string;
  status: GoalStatus; direction: GoalDirection; progress: number; trackStatus: string;
  pacePerWeek?: number; projectedDate?: string; methodology: string; completedDate?: string;
  timeline: GoalTimelinePoint[];
};
export type GoalInput = { type: GoalType; title: string; targetValue: number; unit?: string; startDate: string; targetDate?: string; direction?: GoalDirection };
