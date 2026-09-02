import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useAuth } from "./context/auth";
import { AuthCallbackPage, AuthPage, ResetPasswordPage } from "./pages/AuthPages";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const ExerciseLibraryPage = lazy(() => import("./pages/ExerciseLibraryPage"));
const WorkoutDetailPage = lazy(() => import("./pages/WorkoutDetailPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const LogPage = lazy(() => import("./pages/LogPage"));
const PlansPage = lazy(() => import("./pages/PlansPage"));
const FoodLibraryPage = lazy(() => import("./pages/FoodLibraryPage"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen animate-pulse bg-canvas" />;
  return user ? <AppShell /> : <Navigate to="/login" replace />;
}

export function LegacyRedirect({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search && !to.includes("?") ? search : ""}`} replace />;
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
          <Route path="/foods" element={<FoodLibraryPage />} />
          <Route path="/meal-planner" element={<PlansPage />} />
          <Route path="/exercises" element={<ExerciseLibraryPage />} />
          <Route path="/ai" element={<InsightsPage />} />
          <Route path="/workouts" element={<LegacyRedirect to="/progress?tab=training" />} />
          <Route path="/workouts/new" element={<LegacyRedirect to="/log?tab=workout" />} />
          <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
          <Route path="/nutrition" element={<LegacyRedirect to="/progress?tab=nutrition" />} />
          <Route path="/water" element={<LegacyRedirect to="/log?tab=water" />} />
          <Route path="/sleep" element={<LegacyRedirect to="/log?tab=sleep" />} />
          <Route path="/body" element={<LegacyRedirect to="/log?tab=body" />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/goals" element={<LegacyRedirect to="/progress?tab=goals" />} />
          <Route path="/plans" element={<LegacyRedirect to="/meal-planner" />} />
          <Route path="/insights" element={<LegacyRedirect to="/ai" />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
