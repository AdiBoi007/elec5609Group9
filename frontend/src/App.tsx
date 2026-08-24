import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useAuth } from "./context/auth";
import { AuthCallbackPage, AuthPage, ResetPasswordPage } from "./pages/AuthPages";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const WorkoutsPage = lazy(() => import("./pages/Workouts"));
const NewWorkoutPage = lazy(() => import("./pages/NewWorkout"));
const WorkoutDetailPage = lazy(() =>
  import("./pages/NewWorkout").then((module) => ({
    default: module.WorkoutDetailPage,
  })),
);
const NutritionPage = lazy(() =>
  import("./pages/FeaturePages").then((module) => ({ default: module.NutritionPage })),
);
const WaterPage = lazy(() =>
  import("./pages/FeaturePages").then((module) => ({ default: module.WaterPage })),
);
const SleepPage = lazy(() => import("./pages/SleepPage"));
const BodyPage = lazy(() => import("./pages/BodyPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const GoalsPage = lazy(() => import("./pages/GoalsPage"));
const LogPage = lazy(() => import("./pages/LogPage"));
const PlansPage = lazy(() => import("./pages/PlansPage"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen animate-pulse bg-canvas" />;
  return user ? <AppShell /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen animate-pulse bg-canvas" />}>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/workouts" element={<WorkoutsPage />} />
          <Route path="/workouts/new" element={<NewWorkoutPage />} />
          <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
          <Route path="/nutrition" element={<NutritionPage />} />
          <Route path="/water" element={<WaterPage />} />
          <Route path="/sleep" element={<SleepPage />} />
          <Route path="/body" element={<BodyPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
